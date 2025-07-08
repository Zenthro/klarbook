import { documentExtractTask } from "~~/packages/tasks/document/extract"
import { documents, organisations } from "~~/server/database/schema"
import { uuidv7 } from "uuidv7"
import * as crypto from "node:crypto"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  try {
    const formData = await readFormData(event)

    const file = formData.get("file") as FormDataEntryValue as File
    if (!file) throw createError({ statusCode: 400, message: "No file provided" })

    // Generate a new file id for storage and the document record
    const fileId = uuidv7()

    // // Extract file metadata
    const fileName = file.name
    // const fileType = file.type

    // Read the file as an ArrayBuffer and convert to a Buffer for storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const createdDocument = await useDrizzle().transaction<typeof documents.$inferSelect | undefined>(async (tx) => {
      // Generate hash
      const fileSHA256Hash = byfferToSHA256Hash(buffer)

      // First check if a document with the same file hash already exists
      const [existingDocument] = await tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.type, "beleg"),
            eq(documents.fileHash, fileSHA256Hash),
            eq(documents.organisationId, secure.organisationId),
          ),
        )
        .limit(1)
      if (existingDocument) return console.info(`Skipping upload of file ${fileName} because it already exists`)

      // Update and select the next document id
      const [meta] = await tx
        .update(organisations)
        .set({
          documentNextId: sql`${organisations.documentNextId} + 1`,
        })
        .where(eq(organisations.id, secure.organisationId))
        .returning({
          documentNextId: organisations.documentNextId,
        })

      if (!meta) throw new Error("Failed to select next document id")

      const [createdDocument] = await tx
        .insert(documents)
        .values({
          documentId: meta.documentNextId,
          status: "loading",
          type: "beleg",
          fileId: fileId,
          fileHash: fileSHA256Hash,
          organisationId: secure.organisationId,
        })
        .returning()

      return createdDocument
    })
    if (!createdDocument) return {}

    // Save the raw file in Hetzner Storage
    await useS3Storage().setItemRaw(fileId, buffer)

    // Trigger background process
    await documentExtractTask.trigger({ documentId: createdDocument.id, organisationId: secure.organisationId })

    return createdDocument
  } catch (error) {
    console.error(error)
    throw createError({ statusCode: 400, message: "Invalid request body", data: error })
  }
})

// Helper
function byfferToSHA256Hash(buffer: Buffer<ArrayBufferLike>) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}
