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

async function assIssuesToGUIProject(args: IArgs) {
  const repos = await getReposByTopic('ipfs-gui')

  const queries = joinQueryParts(repos.map(r => `repo:${r.full_name}`))

  for (const query of queries) {
    await addIssuesToProject(
      'ipfs',
      17,
      `is:issue ${query} ${args.query}`,
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

assIssuesToGUIProject(args)
