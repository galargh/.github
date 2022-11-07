import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { createAppAuth } from '@octokit/auth-app'
import env from './env'
import { paginateGraphql } from '@octokit/plugin-paginate-graphql'

const Client = Octokit.plugin(retry, throttling, paginateGraphql)
export const Endpoints = new Octokit()

export class GitHub {
  static github: GitHub
  static async getGitHub(): Promise<GitHub> {
    if (GitHub.github === undefined) {
      if (env.GITHUB_TOKEN) {
        core.info('Using GITHUB_TOKEN')
        GitHub.github = new GitHub(env.GITHUB_TOKEN)
      } else if (
        env.GITHUB_APP_ID &&
        env.GITHUB_APP_INSTALLATION_ID &&
        env.GITHUB_APP_PEM_FILE
      ) {
        core.info('Using GITHUB_APP_*')
        const auth = createAppAuth({
          appId: env.GITHUB_APP_ID,
          privateKey: env.GITHUB_APP_PEM_FILE
        })
        const installationAuth = await auth({
          type: 'installation',
          installationId: env.GITHUB_APP_INSTALLATION_ID
        })
        GitHub.github = new GitHub(installationAuth.token)
      } else {
        throw new Error('No authentication method found')
      }
    }
    return GitHub.github
  }

  client: InstanceType<typeof Client>

  private constructor(token: string) {
    this.client = new Client({
      auth: token,
      throttle: {
        onRateLimit: (
          retryAfter: number,
          options: {
            method: string
            url: string
            request: { retryCount: number }
          }
        ) => {
          core.warning(
            `Request quota exhausted for request ${options.method} ${options.url}`
          )

          // retry forever
          core.info(
            `Retrying attempt ${options.request.retryCount} after ${retryAfter} seconds!`
          )
          return true
        },
        onSecondaryRateLimit: (
          retryAfter: number,
          options: {
            method: string
            url: string
            request: { retryCount: number }
          }
        ) => {
          core.warning(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          )

          // retry forever
          core.info(
            `Retrying attempt ${options.request.retryCount} after ${retryAfter} seconds!`
          )
          return true
        }
      }
    })
  }
}
