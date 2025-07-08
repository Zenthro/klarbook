import { documents } from "~~/server/database/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

// TODO: instead of downloading and returning the file, we should return a s3 signed url
export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const params = await getValidatedRouterParams(event, paramsSchema.parse)

  const [document] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)))
  if (!document) throw createError({ statusCode: 404, message: "Document not found" })
  if (!document.fileId) throw createError({ statusCode: 404, message: "File not found" })

  const buffer = await useS3Storage().getItemRaw(document.fileId)

  setHeader(event, "Content-Type", "application/pdf")
  // setHeader(event, "Content-Length", file.size)
  setHeader(event, "Cache-Control", "max-age=31536000")

  return new Response(buffer)
})
