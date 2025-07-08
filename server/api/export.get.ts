import { documents } from "~~/server/database/schema"
import { gte, isNull, lte } from "drizzle-orm"
import { generate } from "csv"
import JSZip from "jszip"
import { z } from "zod"

const querySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { startDate, endDate } = await getValidatedQuery(event, querySchema.parse)

  const bankTransactions = await useDrizzle().query.documents.findMany({
    with: {
      references: {
        with: {
          document: {},
        },
      },
    },
    where: and(
      gte(documents.date, startDate),
      lte(documents.date, endDate),
      eq(documents.type, "bank-transaction"),
      or(eq(documents.status, "unmatched"), eq(documents.status, "matched")),
      isNull(documents.deletedAt),
      eq(documents.organisationId, secure.organisationId),
    ),
  })

  const csv = bankTransactions.map((doc) => {
    return {
      id: doc.id,
      date: doc.date,
      status: doc.status,
      description: doc.description,
      amount: doc.amount,
      files: doc.references.map((ref) => documentFileName(ref.document)).join(", "),
    }
  })

  // generate a zip with zip.js
  const zip = new JSZip()

  // generate the csv with headers
  const csvContent = generate(csv)

  // add the csv to the zip
  zip.file("export.csv", csvContent)

  // for all the bankTransaction.referenceFiles, download them and also add them to the zip
  for (const bankTransaction of bankTransactions) {
    for (const referenceFile of bankTransaction.references) {
      const file = await useS3Storage().getItemRaw(referenceFile.document.fileId!)
      zip.file(documentFileName(referenceFile.document), file)
    }
  }

  // generate the zip file
  const zipFile = await zip.generateAsync({ type: "blob" })

  setHeader(event, "Content-Type", "application/zip")
  setHeader(event, "Content-Disposition", `attachment; filename="export.zip"`)
  return new Response(zipFile)
})

function documentFileName(document: any) {
  return `${document.date}-${document.number}.pdf`
}
