import { banks, documents } from "../../database/schema"
import { z } from "zod"

// const querySchema = z.object({
//   status: z.enum(["unmatched", "matched", "ignore", "error", ""]).optional(),
//   search: z.string().optional(),
//   type: z.enum(["beleg", "bank-transaction", "bank-account"]).optional(),
// })

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  return await useDrizzle()
    .select()
    .from(banks)
    .where(and(eq(banks.organisationId, secure.organisationId)))
    .limit(100)
})
