import { parse } from 'ts-command-line-args'
import { updateStatusHistory } from './shared/update-status-history'

interface IArgs {
  org: string
  projectNumber: number
  dryRun: boolean
}

const args = parse<IArgs & { help?: boolean }>(
  {
    dryRun: Boolean,
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

updateStatusHistory(args.org, args.projectNumber, args.dryRun)
