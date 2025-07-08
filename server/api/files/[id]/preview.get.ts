import { documents } from "~~/server/database/schema"
import { definePDFJSModule, renderPageAsImage } from "unpdf"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const [document] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organisationId, secure.organisationId)))
  if (!document) throw createError({ statusCode: 404, message: "Document not found" })
  if (!document.fileId) throw createError({ statusCode: 404, message: "File not found" })

  const buffer = await useS3Storage().getItemRaw(document.fileId)

  // generate preview
  const uint8Array = new Uint8Array(buffer)

  const preview = await renderPreview(uint8Array)

  // what's the file type
  const contentLength = preview.byteLength

  setHeader(event, "Content-Type", "image/png")
  setHeader(event, "Content-Length", contentLength)
  // set cache header
  setHeader(event, "Cache-Control", "max-age=31536000")

  return new Response(preview)
})

async function renderPreview(buffer: Uint8Array): Promise<ArrayBuffer> {
  const pageNumber = 1

  // Use the official PDF.js build
  //   await definePDFJSModule(() => import("pdfjs-dist"))

  const result: ArrayBuffer = await renderPageAsImage(buffer, pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: 2,
  })

  return result
}
