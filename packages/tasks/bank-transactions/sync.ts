import { bankAccounts, cache, documents, organisations } from "~~/server/database/schema"
import { sql, eq, and, or, asc, desc } from "drizzle-orm"
import { useDrizzle } from "~~/server/utils/drizzle"
import { gocardless } from "~~/server/utils/gocardless"
import { schemaTask, logger } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import { addHours, format, toDate } from "date-fns"

export const bankTransactionSyncTask = schemaTask({
  id: "bank-transactions-sync",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 600, // Stop executing after 600 secs (10 mins) of compute
  schema: z.object({
    organisationId: z.string().uuid(),
  }),
  queue: {
    concurrencyLimit: 1,
  },
  run: async ({ organisationId }, { ctx }) => {
    const result = await useDrizzle()
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.syncing, true), eq(bankAccounts.organisationId, organisationId)))

    const { token } = await gocardless.accessToken(organisationId)
    if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

    try {
      for (const account of result) {
        console.log(`Processing transactions for account ${account.name}`)

        // Check if there are any transactions
        const existingBankTransactions = await useDrizzle()
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.type, "bank-transaction"),
              eq(documents.bankAccountId, account.id),
              eq(documents.organisationId, organisationId),
            ),
          )
          .limit(5)

        const latest = existingBankTransactions.length > 0

        const transactions = await fetchTransactionCached(token, account.organisationId, account.externalId, latest)
        if (!transactions) {
          console.log(`No transactions found for account ${account.name}, skipping`)
          continue
        }

        for (const unstructured of transactions.reverse()) {
          const transaction = transformTransaction(unstructured)

          console.log(`Processing transaction`, transaction.externalId)

          // Check if a bank transaction with the same external id already exists
          const [existingBankTransaction] = await useDrizzle()
            .select()
            .from(documents)
            .where(and(eq(documents.type, "bank-transaction"), eq(documents.externalId, transaction.externalId)))
            .limit(1)
          if (existingBankTransaction) {
            console.log(`Skipping transaction ${transaction.externalId} because it already exists`)
            continue
          }

          // Create document of type bank-transaction
          try {
            await useDrizzle().transaction(async (tx) => {
              // Select the next document id
              const [meta] = await tx
                .update(organisations)
                .set({
                  documentNextId: sql`${organisations.documentNextId} + 1`,
                })
                .where(eq(organisations.id, organisationId))
                .returning({
                  documentNextId: organisations.documentNextId,
                })

              if (!meta) throw new Error("Failed to select next document id")

              const nextId = meta.documentNextId

              await tx.insert(documents).values({
                type: "bank-transaction",
                status: "unmatched",
                documentId: nextId,
                //
                date: transaction.date,
                amount: transaction.amount,
                currency: transaction.currency,
                description: transaction.description,

                externalId: transaction.externalId,
                organisationId: organisationId,
              })
            })
          } catch (error) {
            console.error(error)
            logger.error("Failed to create bank transaction", { error })
          }
        }
      }
    } catch (error) {
      console.error(error)
      logger.error("Failed to process bank transactions", { error })
    }

    console.log("Finished processing bank transactions")

    return {}
  },
})

async function fetchTransactionCached(
  accessToken: string,
  organisationId: string,
  accountExternalId: string,
  latest = false,
) {
  const today = format(toDate(new Date()), "yyyy-MM-dd")

  const cacheKey = `gocardless-transactions-${organisationId}-${accountExternalId}-${today}`

  const [cached] = await useDrizzle().select().from(cache).where(eq(cache.key, cacheKey)).limit(1)
  if (cached) {
    console.log(`Using cached transactions for ${accountExternalId}`)
    return cached.value
  }

  const transactions = await gocardless.transactions.list({
    accessToken: accessToken,
    accountId: accountExternalId,
    latest, // only fetch the latest transactions
  })

  // Update cache
  await useDrizzle().transaction(async (tx) => {
    await tx.insert(cache).values({
      key: cacheKey,
      value: transactions,
      expiresAt: addHours(new Date(), 12),
    })
  })

  return transactions
}

/********** HELPERs **********/

interface FormattedTransaction {
  date: string
  name: string
  amount: string
  currency: string
  description: string
  externalId: string
}

function transformName(transaction: Transaction) {
  const amount = parseFloat(transaction.transactionAmount.amount)

  // if transaction amount is negative, check if the debtor name is set
  if (amount < 0) {
    // return transaction.creditorName ?? ""

    if (transaction.creditorName) {
      return transaction.creditorName
    }
  } else {
    // return transaction.debtorName ?? ""
    if (transaction.debtorName) {
      return transaction.debtorName
    }
  }

  return "No information"
}

function transformDescription(transaction: Transaction): string {
  if (transaction.remittanceInformationUnstructuredArray) {
    return transaction.remittanceInformationUnstructuredArray.join(" ")
  }

  if (transaction.remittanceInformationUnstructured) {
    return transaction.remittanceInformationUnstructured
  }

  if (transaction.remittanceInformationStructuredArray) {
    return transaction.remittanceInformationStructuredArray.join(" ")
  }

  if (transaction.remittanceInformationStructured) {
    return transaction.remittanceInformationStructured
  }

  return "No information"
}

function transactionHash(transaction: Transaction) {
  if (transaction.internalTransactionId) return transaction.internalTransactionId
  if (transaction.transactionId) return transaction.transactionId

  return `${transaction.bookingDate}-${transaction.transactionAmount.amount}-${transaction.transactionAmount.currency}`
}

export const transformTransaction = (transaction: Transaction): FormattedTransaction => {
  return {
    date: transaction.bookingDate,
    name: transformName(transaction),
    amount: transaction.transactionAmount.amount,
    currency: transaction.transactionAmount.currency,
    description: transformDescription(transaction),
    externalId: transactionHash(transaction),
  }
}
