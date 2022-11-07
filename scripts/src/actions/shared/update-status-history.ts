import { GitHub } from '../../github'
import * as core from '@actions/core'
import assert from 'assert'
import { GraphQlResponse } from '@octokit/graphql/dist-types/types'

async function updateProjectV2ItemFieldValue(projectId: string, itemId: string, fieldId: string, value: string): GraphQlResponse<unknown> {
  const github = await GitHub.getGitHub()
  return github.client.graphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: {
            text: $value
          }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }`,
    {
      projectId,
      itemId,
      fieldId,
      value
    }
  )
}

export async function updateStatusHistory(
  org: string,
  projectNumber: number,
  dryRun: boolean
) {
  const date = new Date()
  const timestamp = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}`
  const simpleDate = `${date.getUTCDate()}/${date.getUTCMonth()}/${date.getUTCFullYear()}`
  const github = await GitHub.getGitHub()

  core.info(`Searching for project: ${org}/${projectNumber}`)
  // Find the project (we need its' id)
  const {
    organization: { projectV2: project }
  } = (await github.client.graphql.paginate(
    `query($login: String!, $number: Int!) {
      organization(login: $login) {
        projectV2(number: $number) {
          id
          fields(first: 100) {
            nodes {
              id
              name
              settings
            }
          }
          items(first: 100, after: $cursor) {
            nodes {
              id
              title
              fieldValues(first: 100) {
                nodes {
                  value
                  projectField {
                    id
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }`,
    {
      login: org,
      number: projectNumber
    }
  )) as any
  core.info(`Found project: ${project.id}`)

  core.info(`Checking if required fields exist`)
  const statusField = project.fields.nodes.find((field: any) => field.name === 'Status')
  assert(statusField, `Project must have a field named 'Status'`)
  const statusDateField = project.fields.nodes.find((field: any) => field.name === 'Status Date')
  assert(statusDateField, `Project must have a field named 'Status Date'`)
  const statusHistoryField = project.fields.nodes.find((field: any) => field.name === 'Status History')
  assert(statusHistoryField, `Project must have a field named 'Status History'`)
  const statusTimestampField = project.fields.nodes.find((field: any) => field.name === 'Status Timestamp')
  assert(statusTimestampField, `Project must have a field named 'Status Timestamp'`)
  core.info(`Found all required fields`)

  core.info(`Updating status history for all items`)
  for (const item of project.items.nodes) {
    if (item.title === "You can't see this item") {
      core.warning(`The following item is inaccessible: ${JSON.stringify(item)}`)
      continue
    }
    core.debug(`Checking if item needs to be updated: ${item.id} (${item.title})`)
    const status = item.fieldValues.nodes.find((field: any) => field.projectField.id === statusField.id)?.value
    const statusHistory = JSON.parse(item.fieldValues.nodes.find((fieldValue: any) => fieldValue.projectField.id === statusHistoryField.id)?.value || '[]')
    if (status === statusHistory.at(0)) {
      core.debug(`Item is up to date: ${item.id} (${item.title})`)
      continue
    }
    if (dryRun) {
      core.info(`Would have updated item: ${item.id} (${item.title})`)
      continue
    }
    core.info(`Updating item: ${item.id} (${item.title})`)
    const newStatusHistory = [status.value, ...statusHistory.slice(0, 1)]
    await updateProjectV2ItemFieldValue(project.id, item.id, statusHistoryField.id, JSON.stringify(newStatusHistory))
    await updateProjectV2ItemFieldValue(project.id, item.id, statusTimestampField.id, timestamp)
    await updateProjectV2ItemFieldValue(project.id, item.id, statusDateField.id, simpleDate)
    core.info(`Updated item: ${item.id} (${item.title})`)

  }
  core.info(`Done`)
}
