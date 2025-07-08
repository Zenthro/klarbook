import { stripe } from "~~/server/utils/stripe"
import { documentExtractTask } from "~~/packages/tasks/document/extract"
import { documents, organisations } from "~~/server/database/schema"
import { eq, and, sql } from "drizzle-orm"
import { uuidv7 } from "uuidv7"
import * as crypto from "node:crypto"
import { useS3Storage } from "~~/server/utils/storage"
import { useDrizzle } from "~~/server/utils/drizzle"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) {
    throw createError({
      statusCode: 401, 
      message: "Unauthorized"
    })
  }
  
  // Get the Stripe API key
  const auth = await stripe.accessToken(secure.organisationId)
  if (!auth) {
    throw createError({
      statusCode: 400,
      message: "Stripe is not connected"
    })
  }
  
  // Fetch invoices from Stripe
  const invoices = await stripe.invoices.list(auth.apiKey)
  
  let processed = 0
  let failed = 0
  
  // Process each invoice
  for (const invoice of invoices) {
    try {
      // Skip invoices without PDF
      if (!invoice.invoice_pdf) {
        failed++
        continue
      }
      
      // Get the PDF buffer
      const pdfBuffer = await stripe.invoices.getPDF(auth.apiKey, invoice.id)
      
      // Generate file hash to check for duplicates
      const fileSHA256Hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")
      
      // Check if document already exists
      const existingDocument = await useDrizzle()
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
        .then(res => res[0])
      
      if (existingDocument) {
        // Skip if document already exists
        processed++
        continue
      }
      
      // Generate a new file id for storage
      const fileId = uuidv7()
      
      // Create document in database
      const createdDocument = await useDrizzle().transaction(async (tx) => {
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
      
      // Save the PDF file in storage
      await useS3Storage().setItemRaw(fileId, pdfBuffer)
      
      // Trigger document processing
      await documentExtractTask.trigger({
        documentId: createdDocument.id,
        organisationId: secure.organisationId
      })
      
      processed++
    } catch (error) {
      console.error(`Error processing Stripe invoice ${invoice.id}:`, error)
      failed++
    }
  }
  
  return {
    success: true,
    total: invoices.length,
    processed,
    failed
  }
})