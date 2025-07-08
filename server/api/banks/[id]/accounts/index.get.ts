import { bankAccounts, banks, documents } from "~~/server/database/schema"

// const querySchema = z.object({
//   status: z.enum(["unmatched", "matched", "ignore", "error", ""]).optional(),
//   search: z.string().optional(),
//   type: z.enum(["beleg", "bank-transaction", "bank-account"]).optional(),
// })

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const result = await useDrizzle()
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.organisationId, secure.organisationId)))
    .limit(100)

  return result
})
