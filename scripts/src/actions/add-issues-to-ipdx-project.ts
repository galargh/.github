import { orgs } from '../config'
import { parse } from 'ts-command-line-args'
import { addIssuesToProject } from './shared/add-issues-to-project'

interface IArgs {
  dryRun: boolean
  query: string
}

function evenIndex(_: any, index: number) { return index % 2 === 0 }
function oddIndex(_: any, index: number) { return index % 2 === 1 }

async function addIssuesToIPDXProject(args: IArgs) {
  const org = 'pl-strflt'
  const projectNumber = 1
  const members = ['galargh', 'laurentsenta']
  const orgsWithoutIPDX = ['filecoin-project', 'ipfs-examples']
  const repos = [
    'galargh/gadder',
    'ipfs/download-ipfs-distribution-action',
    'ipfs/start-ipfs-daemon-action',
    'pl-strflt/projects-migration',
    'pl-strflt/projects-status-history',
    'pl-strflt/rust-sccache-action',
    'protocol/.github-test-target',
    'protocol/.github',
    'protocol/cache-go-action',
    'protocol/github-api-action-library',
    'testground/testground-github-action'
  ]

  const orgQ = orgs.map(o => `org:${o}`).join(' ')
  const involvesQ = members.map(m => `involves:${m}`).join(' ')
  const userReviewRequestedQ = members
    .map(m => `user-review-requested:${m}`)
    .join(' ')
  const teamQ = orgs
    .filter(o => !orgsWithoutIPDX.includes(o))
    .map(o => `team:${o}/ipdx`)
    .join(' ')
  const repoQ1 = repos.filter(evenIndex).map(r => `repo:${r}`).join(' ')
  const repoQ2 = repos.filter(oddIndex).map(r => `repo:${r}`).join(' ')
  const githubManagementRepoQ1 = orgs.filter(evenIndex).map(o => `repo:${o}/github-mgmt`).join(' ')
  const githubManagementRepoQ2 = orgs.filter(oddIndex).map(o => `repo:${o}/github-mgmt`).join(' ')

  const queries = [
    //`${orgQ} ${involvesQ}`,
    //`${orgQ} ${userReviewRequestedQ}`,
    //teamQ,
    //'label:team/ipdx',
    //repoQ1,
    //repoQ2,
    //`is:issue ${githubManagementRepoQ1}`,
    //`is:issue ${githubManagementRepoQ2}`,
    `is:pr is:open ${githubManagementRepoQ1}`,
    `is:pr is:open ${githubManagementRepoQ2}`,
    //'involves:web3-bot is:open'
  ]

  for (const query of queries) {
    await addIssuesToProject({
      org,
      projectNumber,
      dryRun: args.dryRun,
      query: `${query} ${args.query}`
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

addIssuesToIPDXProject(args)
