import { GitHub, Endpoints } from '../github'
import { orgs } from '../config'
import * as core from '@actions/core'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import { parse } from 'ts-command-line-args'
import { addIssuesOrPullRequestsToProject } from './shared/add-issues-or-pull-requests-to-project'

type Repos = GetResponseDataTypeFromEndpointMethod<
  typeof Endpoints.search.repos
>

interface IArgs {
  dryRun: boolean
  query: string
}

async function assIssuesToGUIProject(args: IArgs) {
  const topics = ['ipfs-gui']

  const github = await GitHub.getGitHub()

  core.info(`Searching for repos with topics: ${topics.join(', ')}`)
  // Find all repos matching the topics in the PL orgs
  const repos: string[] = []
  for (const topic of topics) {
    const result = await github.client.paginate(github.client.search.repos, {
      q: `${orgs.map(o => `org:${o}`).join(' ')} archived:false topic:${topic}`
    })
    for (const repo of result) {
      if (!repos.includes(repo.full_name)) {
        repos.push(repo.full_name)
      }
    }
  }
  core.info(`Found ${repos.join(', ')}`)

  // Add all open issues from the found projects which are not yet in the GUI project
  for (const repo of repos) {
    await addIssuesOrPullRequestsToProject({
      org: 'ipfs',
      projectNumber: 17,
      dryRun: args.dryRun,
      query: `repo:${repo} is:issue ${args.query}`
    })
  }
}

const args = parse<IArgs & { help?: boolean }>(
  {
    dryRun: Boolean,
    query: String,
    help: {
      type: Boolean,
      optional: true,
      alias: 'h',
      description: 'Prints this usage guide'
    }
  },
  {
    helpArg: 'help'
  }
)

assIssuesToGUIProject(args)
