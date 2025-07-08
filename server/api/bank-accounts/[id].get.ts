import { bankAccounts } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const bankAccountId = getRouterParam(event, "id")
  if (!bankAccountId) throw createError({ statusCode: 400, message: "Invalid bank account id" })

  const [bankAccount] = await useDrizzle()
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.organisationId, secure.organisationId)))
    .limit(1)

  return bankAccount
})
