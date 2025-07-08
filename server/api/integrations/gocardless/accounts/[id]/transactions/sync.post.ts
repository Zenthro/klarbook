import { gocardless } from "~~/server/utils/gocardless"
import { organisations, bankAccounts, documents } from "~~/server/database/schema"
import { z } from "zod"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const accountId = getRouterParam(event, "id")
  if (!accountId) throw createError({ statusCode: 400, message: "Invalid request body" })

  // event.waitUntil(processTransactions(secure, accountId))

  return {}
})

async function processTransactions(secure: { organisationId: string }, accountId: string) {
  const [account] = await useDrizzle()
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.organisationId, secure.organisationId)))

  const { token } = await gocardless.accessToken(secure.organisationId)
  if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

  console.log(`Processing transactions for account ${account.name}`)

  const transactions = await gocardless.transactions.list({ accessToken: token, accountId: account.externalId })
  console.log("transactions", transactions.length)

  for (const transaction of transactions) {
    console.log(`Processing transaction`, transaction.internalTransactionId)
    let externalId = ""
    if (transaction.internalTransactionId) {
      externalId = transaction.internalTransactionId
    } else if (transaction.transactionId) {
      externalId = transaction.transactionId
    } else if (transaction.id) {
      externalId = transaction.id
    } else {
      console.error("No transaction id found")
      continue
    }

    // Create document of type bank-transaction
    await useDrizzle().transaction(async (tx) => {
      // Fetch the current next document id
      const [meta] = await tx
        .select({
          nextId: organisations.documentNextId,
        })
        .from(organisations)
        .where(eq(organisations.id, secure.organisationId))
        .limit(1)
        .for("update") // lock the organisation for the duration of the transaction

      // Check if a bank transaction with the same external id already exists
      const [existingBankTransaction] = await tx
        .select()
        .from(documents)
        .where(and(eq(documents.type, "bank-transaction"), eq(documents.externalId, externalId)))
        .limit(1)

      if (existingBankTransaction) {
        console.log(`Skipping transaction ${externalId} because it already exists`)
        return
      }

      const [createdDocument] = await tx
        .insert(documents)
        .values({
          type: "bank-transaction",
          status: "unmatched",
          documentId: meta.nextId,
          //
          date: transaction.bookingDate,
          senderName: transaction.debtorName,
          recipientName: account.name,
          amount: transaction.transactionAmount.amount,
          currency: transaction.transactionAmount.currency,
          description: transaction.remittanceInformationUnstructuredArray.join(`\n`),
          //
          // TODO: hash: transaction.hash,
          //
          externalId: externalId,
          organisationId: secure.organisationId,
        })
        .returning()

      // Increase next document id
      await tx
        .update(organisations)
        .set({
          documentNextId: meta.nextId + 1,
        })
        .where(eq(organisations.id, secure.organisationId))

      return createdDocument
    })
  }
}
