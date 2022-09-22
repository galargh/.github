import { GitHub, Endpoints } from '../../github'
import * as core from '@actions/core'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import assert from 'assert'

type Issues = GetResponseDataTypeFromEndpointMethod<
  typeof Endpoints.search.issuesAndPullRequests
>

export interface IArgs {
  org: string
  projectNumber: number
  dryRun: boolean
  query: string
}

export async function addIssuesToProject(args: IArgs) {
  assert(
    args.query.length <= 256,
    `Query must be less than 256 characters, got ${args.query}`
  )

  const github = await GitHub.getGitHub()

  core.info(`Searching for project: ${args.org}/${args.projectNumber}`)
  // Find the project (we need its' id)
  const {
    organization: { projectV2: project }
  } = (await github.graphqlClient(
    `query($login: String!, $number: Int!) {
      organization(login: $login) {
        projectV2(number: $number) {
          id
        }
      }
    }`,
    {
      login: args.org,
      number: args.projectNumber
    }
  )) as any
  core.info(`Found project: ${project.id}`)

  const q = `${args.query} -project:${args.org}/${args.projectNumber}`
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

  core.info(`Adding issues to ${args.org}/${args.projectNumber}`)
  // Add all the found issues to the project
  for (const issue of issues) {
    // If the issue is in a repo that is in the same org as the project, add the issue to the project
    // Otherwise, create a new draft item in the project with a link to the issue (it will get automatically turned into a proper item)
    if (issue.repository_url.split('/').reverse()[1] === args.org) {
      if (args.dryRun) {
        core.info(
          `Would have added ${issue.html_url} to ${args.org}/${args.projectNumber}`
        )
      } else {
        core.info(
          `Adding ${issue.html_url} to ${args.org}/${args.projectNumber}`
        )
        const {
          addProjectV2ItemById: { item: item }
        } = (await github.graphqlClient(
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
          `Added ${issue.html_url} to ${args.org}/${args.projectNumber} as ${item.id}`
        )
      }
    } else {
      if (args.dryRun) {
        core.info(
          `Would have added ${issue.html_url} to ${args.org}/${args.projectNumber} (draft)`
        )
      } else {
        core.info(
          `Adding ${issue.html_url} to ${args.org}/${args.projectNumber} (draft)`
        )
        const {
          addProjectV2DraftIssue: { projectItem: item }
        } = (await github.graphqlClient(
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
          `Added ${issue.html_url} to ${args.org}/${args.projectNumber} as ${item.id} (draft)`
        )
      }
    }
  }
  core.info(`Done`)
}
