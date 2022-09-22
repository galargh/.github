import { GitHub, Endpoints } from '../github'
import { orgs } from '../config'
import * as core from '@actions/core'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import env from '../env'

type Repos = GetResponseDataTypeFromEndpointMethod<
  typeof Endpoints.search.repos
>
type Issues = GetResponseDataTypeFromEndpointMethod<
  typeof Endpoints.search.issuesAndPullRequests
>

async function assIssuesToGUIProject() {
  const dryRun = true // core.getBooleanInput('dry-run')
  core.info(`dryRun: ${core.getBooleanInput('dry-run')}`)
  const query = core.getInput('query')
  core.info(`query: ${query}`)
  const org = 'ipfs'
  const projectNumber = 17
  const topics = ['ipfs-gui']

  const github = await GitHub.getGitHub()

  // Find all repos matching the topics in the PL orgs
  const repos: Repos['items'] = []
  for (const topic of topics) {
    const result = await github.client.paginate(github.client.search.repos, {
      q: `${orgs.map(o => `org:${o}`).join(' ')} archived:false topic:${topic}`
    })
    for (const repo of result) {
      if (!repos.map(r => r.full_name).includes(repo.full_name)) {
        repos.push(repo)
      }
    }
  }

  // Find all open issues not yet in the project in the found repos
  const sameOrgIssues: Issues['items'] = []
  const otherOrgIssues: Issues['items'] = []
  for (const repo of repos) {
    const result = await github.client.paginate(
      github.client.search.issuesAndPullRequests,
      {
        q: `repo:${repo.full_name} is:issue -project:${org}/${projectNumber} ${query}`
      }
    )
    if (repo.owner?.login === org) {
      sameOrgIssues.push(...result)
    } else {
      otherOrgIssues.push(...result)
    }
  }

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
      login: org,
      number: projectNumber
    }
  )) as any

  // Add all the found issues to the project
  // If the issue is in a repo that is in the same org as the project, add the issue to the project
  for (const issue of sameOrgIssues) {
    if (dryRun) {
      core.info(`Would have added ${issue.html_url} to ${org}/${projectNumber}`)
    } else {
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
          contentId: issue.id
        }
      )) as any
      core.info(
        `Added ${issue.html_url} to ${org}/${projectNumber} as ${item.id}`
      )
    }
  }
  // Otherwise, create a new draft item in the project with a link to the issue
  for (const issue of otherOrgIssues) {
    if (dryRun) {
      core.info(
        `Would have added ${issue.html_url} to ${org}/${projectNumber} (draft)`
      )
    } else {
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
        `Added ${issue.html_url} to ${org}/${projectNumber} as ${item.id} (draft)`
      )
    }
  }
}

assIssuesToGUIProject()
