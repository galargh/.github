import { orgs } from '../config'
import { parse } from 'ts-command-line-args'
import {
  addIssuesToProject,
  joinQueryParts
} from './shared/add-issues-to-project'
import { getReposByTopic } from './shared/get-repos-by-topic'

interface IArgs {
  dryRun: boolean
  query: string
}

async function addIssuesToIPDXProject(args: IArgs) {
  const org = 'pl-strflt'
  const projectNumber = 1
  const members = ['galargh', 'laurentsenta']

  const orgQ = orgs.map(o => `org:${o}`).join(' ')
  const involvesQs = joinQueryParts(members.map(m => `involves:${m}`), 192 - orgQ.length).map(
    q => `${orgQ} ${q}`,

  )
  const userReviewRequestedQs = joinQueryParts(
    members.map(m => `user-review-requested:${m}`),
    192 - orgQ.length
  ).map(q => `${orgQ} ${q}`)
  const teamQs = joinQueryParts(
    orgs
      .filter(o => !['filecoin-project', 'ipfs-examples'].includes(o))
      .map(o => `team:${o}/ipdx`)
  )
  const repoQs = joinQueryParts(
    (await getReposByTopic('ipdx')).map(r => `repo:${r.full_name}`)
  )
  const repoIssueQs = repoQs.map(q => `is:issue ${q}`)
  const repoPRQs = repoQs.map(q => `is:pr is:open ${q}`)

  const queries = [
    ...involvesQs,
    ...userReviewRequestedQs,
    ...teamQs,
    ...repoIssueQs,
    ...repoPRQs,
    `label:team/ipdx`,
    `involves:web3-bot is:open`
  ]

  for (const query of queries) {
    await addIssuesToProject(
      org,
      projectNumber,
      `${query} ${args.query}`,
      args.dryRun
    )
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

addIssuesToIPDXProject(args)
