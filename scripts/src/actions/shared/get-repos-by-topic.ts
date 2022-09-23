import { GitHub } from '../../github'
import * as core from '@actions/core'
import { orgs } from '../../config'

export async function getReposByTopic(topic: string) {
  const github = await GitHub.getGitHub()

  core.info(`Searching for repos with topic ${topic}`)
  // Find all repos matching the topics in the PL orgs
  const repos = await github.client.paginate(github.client.search.repos, {
    q: `${orgs.map(o => `org:${o}`).join(' ')} archived:false topic:${topic}`
  })
  core.info(`Found ${repos.map(r => r.full_name).join(', ')}`)

  return repos
}
