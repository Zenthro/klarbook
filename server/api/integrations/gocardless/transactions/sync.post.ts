import { bankTransactionSyncTask } from "~~/packages/tasks/bank-transactions/sync"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  // event.waitUntil(processTransactions(secure))
  await bankTransactionSyncTask.trigger({ organisationId: secure.organisationId })

  return {}
})
