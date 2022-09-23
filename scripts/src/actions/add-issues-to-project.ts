import { parse } from 'ts-command-line-args'
import { addIssuesToProject } from './shared/add-issues-to-project'

interface IArgs {
  org: string
  projectNumber: number
  dryRun: boolean
  query: string
}

const args = parse<IArgs & { help?: boolean }>(
  {
    dryRun: Boolean,
    query: String,
    org: String,
    projectNumber: Number,
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

addIssuesToProject(args.org, args.projectNumber, args.query, args.dryRun)
