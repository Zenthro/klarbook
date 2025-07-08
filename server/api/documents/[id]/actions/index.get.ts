import { documents } from "~~/server/database/schema"
import { eq, and, ne, desc } from "drizzle-orm"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string(),
})

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  // Document
  const [document] = await useDrizzle()
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organisationId, secure.organisationId)))
  if (!document) throw createError({ statusCode: 404, message: "Document not found" })

  // We want to rank related documents by relevance
  // We score each document by:
  // - How closely does the amount match
  // - How closely does the date match
  // - Is the document.number included in the description
  // - Is the document.senderName included in the description
  // - Is document.amount included in the description

  const relatedDocuments = await useDrizzle()
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.status, "unmatched"),
        eq(documents.organisationId, secure.organisationId),
        eq(documents.type, "bank-transaction"),
        ne(documents.id, id), // Exclude the current document
      ),
    )

  // Weight factors for scoring (easily adjustable)
  const weights = {
    amountSimilarity: 1.0,
    dateSimilarity: 1.0,
    numberInDescription: 1.0,
    senderNameInDescription: 5.0,
    amountInDescription: 1.0,
  }

  // Scoring functions
  const scoreByAmount = (doc1: any, doc2: any): number => {
    if (!doc1.amount || !doc2.amount) return 0

    const amount1 = Math.abs(doc1.amount)
    const amount2 = Math.abs(doc2.amount)

    // Avoid division by zero
    if (amount1 === 0) {
      return amount2 === 0 ? 100 : 0
    }

    // Calculate percentage difference
    const percentageDiff = Math.abs(((amount2 - amount1) / amount1) * 100)

    // Score based on percentage differences
    if (percentageDiff === 0) return 100
    else if (percentageDiff <= 10) return 90
    else if (percentageDiff <= 20) return 80
    else if (percentageDiff <= 30) return 70
    else if (percentageDiff <= 40) return 60
    else if (percentageDiff <= 50) return 50
    else if (percentageDiff <= 75) return 25
    else if (percentageDiff <= 100) return 10
    else return 0
  }

  const scoreByDateProximity = (doc1: any, doc2: any): number => {
    if (!doc1.date || !doc2.date) return 0

    const date1 = new Date(doc1.date).getTime()
    const date2 = new Date(doc2.date).getTime()

    // Calculate days difference (positive if date2 is after date1)
    const daysDiff = (date2 - date1) / (1000 * 60 * 60 * 24)

    // For documents of type "beleg", bank transactions typically occur between -5 days and +40 days
    if (daysDiff >= -5 && daysDiff <= 40) {
      if (daysDiff >= -2 && daysDiff <= 5)
        return 100 // Ideal range
      else if (daysDiff >= -3 && daysDiff <= 10) return 80
      else if (daysDiff >= -4 && daysDiff <= 20) return 60
      else return 40 // Within wider window but less ideal
    }

    return 0 // Outside expected window
  }

  const scoreByDescriptionMatch = (doc1: any, doc2: any): number => {
    let score = 0

    if (doc2.description) {
      // Check if document number is in the description
      if (doc1.number && doc2.description.toLowerCase().includes(doc1.number.toLowerCase())) {
        score += 30
      }

      // Check if sender name is in the description
      if (doc1.senderName && doc2.description.toLowerCase().includes(doc1.senderName.toLowerCase())) {
        score += 75
      }

      // Check if amount is in the description
      if (doc1.amount && doc2.description.includes(doc1.amount.toString())) {
        score += 30
      }
    }

    return score
  }

  // Calculate relevance scores
  const scoredDocuments = relatedDocuments.map((relatedDoc) => {
    // Calculate individual scores
    const amountScore = scoreByAmount(document, relatedDoc) * weights.amountSimilarity
    const dateScore = scoreByDateProximity(document, relatedDoc) * weights.dateSimilarity
    const descriptionScore = scoreByDescriptionMatch(document, relatedDoc)

    // Combine scores
    const totalScore = amountScore + dateScore + descriptionScore

    return { ...relatedDoc, relevanceScore: totalScore }
  })

  // Sort by relevance score (highest first)
  const sortedRelatedDocuments = scoredDocuments.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Limit to 5 results
  return sortedRelatedDocuments.slice(0, 3)
})
