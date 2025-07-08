import { useDrizzle } from "~~/server/utils/drizzle"
import { eq, and } from "drizzle-orm"
import { documents } from "~~/server/database/schema"
import { schemaTask } from "@trigger.dev/sdk/v3"
import { storage } from "../utils/storage"
import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

export const documentExtractTask = schemaTask({
  id: "document-extract",
  maxDuration: 300,
  schema: z.object({
    documentId: z.string().uuid(),
    organisationId: z.string().uuid(),
  }),
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ documentId, organisationId }, { ctx }) => {
    // Fetch the document
    const [document] = await useDrizzle()
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organisationId, organisationId)))
    if (!document) throw new Error(`Document with id ${documentId} not found`)

    // Process the file
    await processFile(document)

    return {}
  },
})

// Background process
export async function processFile(document: typeof documents.$inferSelect) {
  // Wait 60ms to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 60))

  try {
    const fileBuffer: ArrayBuffer | null = await storage.fetchItem(document.fileId!)
    if (!fileBuffer) throw new Error(`File not found: ${document.fileId}`)
    const bytes = new Uint8Array(fileBuffer)

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: z.object({
        invoiceDate: z.string().describe("RFC3339"),
        senderName: z.string(),
        receipientName: z.string(),
        invoiceNumber: z.string(),
        dueDate: z.string().nullable().describe("RFC3339 or null"),
        total: z.number(),
        currency: z.string().min(3).max(3).describe("ISO 4217 currency code, 3 letter code"),
        bookingNote: z
          .string()
          .describe(
            "Write a note based on SKR03 booking accounts a accountant would write to describe the invoice in 2-3 words",
          ),
      }),
      messages: [
        {
          role: "user",
          content: `Extract structured data from the provided invoice PDF with high precision. Follow these guidelines:
  
  - Format dates in RFC3339 standard (YYYY-MM-DDThh:mm:ssZ)
  - Use company names for sender/recipient whenever available
  - For German companies, write UG as "UG (haftungsbeschränkt)"
  - Currency must be a valid ISO 4217 3-letter code (e.g., EUR, USD)
  - Create a concise 2-3 word German booking note summarizing the invoice purpose
  - If due date is not specified, return null
  - Extract total amount as a numeric value without currency symbols
  - Ensure all extracted text maintains original spelling and formatting
  
  Return results in the exact schema structure provided.`,
          experimental_attachments: [
            {
              name: "invoice.pdf",
              contentType: "application/pdf",
              url: bytesToPdfDataUrl(bytes),
            },
          ],
        },
      ],
    })

    // update the document with the merged content data
    await useDrizzle()
      .update(documents)
      .set({
        status: "unmatched",
        date: object.invoiceDate,
        senderName: object.senderName,
        recipientName: object.receipientName,
        number: object.invoiceNumber,
        amount: object.total.toFixed(2),
        currency: object.currency,
        note: object.bookingNote,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, document.id))

    return {}
  } catch (error) {
    console.error(error)

    // Update status to error
    await useDrizzle()
      .update(documents)
      .set({
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, document.id))
  }
}

function bytesToPdfDataUrl(bytes: Uint8Array): string {
  // Convert the bytes to base64
  const base64 = btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ""))

  // Return the complete data URL with PDF MIME type
  return `data:application/pdf;base64,${base64}`
}
