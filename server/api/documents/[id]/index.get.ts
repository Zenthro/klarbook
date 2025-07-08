import { documentLinks, documents } from "~~/server/database/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const params = await getValidatedRouterParams(event, paramsSchema.parse)

  let firstDocument = await useDrizzle().query.documents.findFirst({
    with: {
      links: {
        with: {
          link: {},
        },
      },
      references: {
        with: {
          document: {},
        },
      },
    },
    where: and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)),
  })
  if (!firstDocument) throw createError({ statusCode: 404, message: "Document not found" })

  // // TODO: extract this somewhere else
  // // If status is loading and the created date is older than 3 minutes then update the document to error
  // if (firstDocument.status === "loading" && Date.now() - firstDocument.createdAt.getTime() > 3 * 60 * 1000) {
  //   await useDrizzle()
  //     .update(documents)
  //     .set({ status: "error", updatedAt: new Date() })
  //     .where(and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)))

  //   // Refetch the document to get the updated status
  //   firstDocument = await useDrizzle().query.documents.findFirst({
  //     with: {
  //       links: {
  //         with: {
  //           link: {},
  //         },
  //       },
  //     },
  //     where: and(eq(documents.id, params.id), eq(documents.organisationId, secure.organisationId)),
  //   })
  // }

  return firstDocument
})
