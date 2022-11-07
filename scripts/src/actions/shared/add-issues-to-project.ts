import { GitHub, Endpoints } from '../../github'
import * as core from '@actions/core'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import assert from 'assert'

type Issues = GetResponseDataTypeFromEndpointMethod<
  typeof Endpoints.search.issuesAndPullRequests
>

export function joinQueryParts(arr: string[], limit: number = 192): string[] {
  if (arr.length === 0) {
    return []
  } else {
    return arr
      .slice(1)
      .reduce(
        (acc, s) =>
          `${acc.at(-1)} ${s}`.length <= limit
            ? [...acc.slice(0, -1), `${acc.at(-1)} ${s}`]
            : [...acc, s],
        [arr[0]]
      )
  }
}

export async function addIssuesToProject(
  org: string,
  projectNumber: number,
  query: string,
  dryRun: boolean
) {
  const q = `${query} -project:${org}/${projectNumber}`
  assert(q.length <= 256, `Query must be less than 256 characters, got ${q}`)

  const github = await GitHub.getGitHub()

  core.info(`Searching for project: ${org}/${projectNumber}`)
  // Find the project (we need its' id)
  const {
    organization: { projectV2: project }
  } = (await github.client.graphql(
    `query($login: String!, $number: Int!) {
      organization(login: $login) {
        projectV2(number: $number) {
          id
        }
      }
    }`,
    {
      login: org,
      number: projectNumber
    }
  )) as any
  core.info(`Found project: ${project.id}`)

  core.info(`Searching for issues with query: ${q}`)
  // Find that are not yet in the project
  const issues: Issues['items'] = await github.client.paginate(
    github.client.search.issuesAndPullRequests,
    {
      q
    }
  )
  core.info(`Found ${issues.length} issues`)

  assert(issues.length <= 500, 'Too many issues, please refine your query')

  core.info(`Adding issues to ${org}/${projectNumber}`)
  // Add all the found issues to the project
  for (const issue of issues) {
    // If the issue is in a repo that is in the same org as the project, add the issue to the project
    // Otherwise, create a new draft item in the project with a link to the issue (it will get automatically turned into a proper item)
    if (issue.repository_url.split('/').reverse()[1] === org) {
      if (dryRun) {
        core.info(
          `Would have added ${issue.html_url} to ${org}/${projectNumber}`
        )
      } else {
        core.info(`Adding ${issue.html_url} to ${org}/${projectNumber}`)
        try {
          const {
            addProjectV2ItemById: { item: item }
          } = (await github.client.graphql(
            `mutation($projectId: ID!, $contentId: ID!) {
              addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
                item {
                  id
                }
              }
            }`,
            {
              projectId: project.id,
              contentId: issue.node_id
            }
          )) as any
          core.info(
            `Added ${issue.html_url} to ${org}/${projectNumber} as ${item.id}`
          )
        } catch (e) {
          if (
            (e as any)?.errors?.at(0)?.message ===
            'Content already exists in this project'
          ) {
            core.info(
              `Issue ${issue.html_url} already exists in ${org}/${projectNumber}`
            )
          }
        }
      }
    } else {
      if (dryRun) {
        core.info(
          `Would have added ${issue.html_url} to ${org}/${projectNumber} (draft)`
        )
      } else {
        core.info(`Adding ${issue.html_url} to ${org}/${projectNumber} (draft)`)
        try {
          const {
            addProjectV2DraftIssue: { projectItem: item }
          } = (await github.client.graphql(
            `mutation($projectId: ID!, $title: String!) {
              addProjectV2DraftIssue(input: {
                projectId: $projectId,
                title: $title
              }) {
                projectItem {
                  id
                }
              }
            }`,
            {
              projectId: project.id,
              title: issue.html_url
            }
          )) as any
          core.info(
            `Added ${issue.html_url} to ${org}/${projectNumber} as ${item.id} (draft)`
          )
        } catch (e) {
          if (
            (e as any)?.errors?.at(0)?.message ===
            'Content already exists in this project'
          ) {
            core.info(
              `Issue ${issue.html_url} already exists in ${org}/${projectNumber}`
            )
          }
        }
      }
    }
  }
  core.info(`Done`)
}
