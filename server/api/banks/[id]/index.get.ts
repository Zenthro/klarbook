import { banks } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const bankId = getRouterParam(event, "id")
  if (!bankId) throw createError({ statusCode: 400, message: "Invalid bank id" })

  const [bank] = await useDrizzle()
    .select()
    .from(banks)
    .where(and(eq(banks.id, bankId), eq(banks.organisationId, secure.organisationId)))
    .limit(1)

  return bank
})
