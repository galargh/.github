import { parse } from 'ts-command-line-args'
import { IArgs, addIssuesToProject } from './shared/add-issues-to-project'

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

addIssuesToProject(args)
