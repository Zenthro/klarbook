import { gocardless } from "~~/server/utils/gocardless"
import { z } from "zod"
import { bankAccounts, banks } from "~~/server/database/schema"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const config = useRuntimeConfig()

  const [bank] = await useDrizzle()
    .select()
    .from(banks)
    .where(and(eq(banks.reference, id), eq(banks.organisationId, secure.organisationId)))
    .limit(1)
  if (!bank) throw createError({ statusCode: 404, message: "Bank not found" })

  async function updateBankAccounts() {
    const { token } = await gocardless.accessToken(secure.organisationId)
    if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

    // Requisition
    const requisition = await gocardless.requisitions.get(token, bank.requisitionId)

    // Accounts
    let accounts = []

    for (const accountId of requisition.accounts) {
      let account = await gocardless.accounts.get(token, accountId)
      accounts.push(account)
    }

    // Create bank accounts
    for (const account of accounts) {
      // First check if a bank account with the same IBAN already exists
      const [existingBankAccount] = await useDrizzle()
        .select()
        .from(bankAccounts)
        .where(and(eq(bankAccounts.iban, account.iban), eq(bankAccounts.organisationId, secure.organisationId)))

      if (existingBankAccount) {
        console.log(`Skipping bank account ${account.iban} because it already exists`)
        continue
      }

      await useDrizzle().insert(bankAccounts).values({
        name: account.owner_name,
        iban: account.iban,
        bankId: bank.id,
        externalId: account.id,
        organisationId: secure.organisationId,
      })
    }
  }

  await tryCatch(updateBankAccounts())

  return sendRedirect(event, `${config.appUrl}/settings/integrations/gocardless/banks/${bank.id}`)
})
