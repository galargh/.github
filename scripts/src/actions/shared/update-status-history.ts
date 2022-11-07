import { GitHub } from '../../github'
import * as core from '@actions/core'
import assert from 'assert'
import { GraphQlResponse } from '@octokit/graphql/dist-types/types'

async function updateProjectV2ItemFieldValue(
  projectId: string,
  itemId: string,
  fieldId: string,
  value: any
): GraphQlResponse<unknown> {
  const github = await GitHub.getGitHub()
  return github.client.graphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: $value
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
  const datetime = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}`
  const dateonly = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
  const github = await GitHub.getGitHub()

  core.info(`Searching for project: ${org}/${projectNumber}`)
  // Find the project (we need its' id)
  const {
    organization: { projectV2: project }
  } = (await github.client.graphql.paginate(
    `query($login: String!, $number: Int!, $cursor: String) {
      organization(login: $login) {
        projectV2(number: $number) {
          id
          fields(first: 100) {
            nodes {
              ... on Node {
                id
              }
              ... on ProjectV2FieldCommon {
                name
              }
            }
          }
          items(first: 100, after: $cursor) {
            nodes {
              id
              isArchived
              fieldValues(first: 100) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                  }
                  ... on ProjectV2ItemFieldValueCommon {
                    field {
                      ... on Node {
                        id
                      }
                    }
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
  const statusField = project.fields.nodes.find(
    (field: any) => field.name === 'Status'
  )
  assert(statusField, `Project must have a field named 'Status'`)
  const statusDateField = project.fields.nodes.find(
    (field: any) => field.name === 'Status Date'
  )
  assert(statusDateField, `Project must have a field named 'Status Date'`)
  const statusHistoryField = project.fields.nodes.find(
    (field: any) => field.name === 'Status History'
  )
  assert(statusHistoryField, `Project must have a field named 'Status History'`)
  const statusTimestampField = project.fields.nodes.find(
    (field: any) => field.name === 'Status Timestamp'
  )
  assert(
    statusTimestampField,
    `Project must have a field named 'Status Timestamp'`
  )
  const titleField = project.fields.nodes.find(
    (field: any) => field.name === 'Title'
  )
  core.info(`Found all required fields`)

  core.info(`Updating status history for all items`)
  for (const item of project.items.nodes) {
    const title = item.fieldValues.nodes.find(
      (fieldValue: any) => fieldValue.field?.id === titleField.id
    )?.text
    if (title === "You can't see this item") {
      core.warning(`Item is inaccessible: ${item.id} (${title})`)
      continue
    }
    if (item.isArchived) {
      core.debug(`Item is archived: ${item.id} (${title})`)
      continue
    }
    core.debug(`Checking if item needs to be updated: ${item.id} (${title})`)
    const status = item.fieldValues.nodes.find(
      (fieldValue: any) => fieldValue.field?.id === statusField.id
    )?.name
    const statusHistory = JSON.parse(
      item.fieldValues.nodes.find(
        (fieldValue: any) => fieldValue.field?.id === statusHistoryField.id
      )?.text || '[]'
    )
    if (status === statusHistory.at(0)) {
      core.debug(`Item is up to date: ${item.id} (${title})`)
      continue
    }
    if (dryRun) {
      core.info(`Would have updated item: ${item.id} (${title})`)
      continue
    }
    core.info(`Updating item: ${item.id} (${title})`)
    const newStatusHistory = [status.value, ...statusHistory.slice(0, 1)]
    await updateProjectV2ItemFieldValue(
      project.id,
      item.id,
      statusHistoryField.id,
      {
        text: JSON.stringify(newStatusHistory)
      }
    )
    await updateProjectV2ItemFieldValue(
      project.id,
      item.id,
      statusTimestampField.id,
      {
        text: datetime
      }
    )
    await updateProjectV2ItemFieldValue(
      project.id,
      item.id,
      statusDateField.id,
      {
        date: dateonly
      }
    )
    core.info(`Updated item: ${item.id} (${title})`)
  }
  core.info(`Done`)
}
