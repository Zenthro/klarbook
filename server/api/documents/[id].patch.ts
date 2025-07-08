import { documents } from "~~/server/database/schema"
import { z } from "zod"

const bodySchema = z.object({
  note: z.string().optional(),
  amount: z.string().optional(),
  recipientName: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const id = getRouterParam(event, "id")
  if (!id) throw createError({ statusCode: 400, message: "Invalid request body" })

  const { note, amount, recipientName } = await readValidatedBody(event, bodySchema.parse)

  await useDrizzle()
    .update(documents)
    .set({
      ...(note ? { note } : {}),
      ...(amount ? { amount } : {}),
      ...(recipientName ? { recipientName } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, id), eq(documents.organisationId, secure.organisationId)))

  return {}
})
