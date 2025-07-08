import { bankAccounts } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const bankAccountId = getRouterParam(event, "id")
  if (!bankAccountId) throw createError({ statusCode: 400, message: "Invalid bank account id" })

  // Update bank account syncing to false
  await useDrizzle()
    .update(bankAccounts)
    .set({ syncing: false, updatedAt: new Date() })
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.organisationId, secure.organisationId)))

  return {}
})
