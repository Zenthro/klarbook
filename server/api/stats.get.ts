import { count, gt, gte, isNull, lte, sum } from "drizzle-orm"
import { documents } from "../database/schema"
import {
  startOfMonth,
  endOfMonth,
  format,
  toDate,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  formatISO,
  startOfDay,
  endOfDay,
} from "date-fns"

export default defineEventHandler(async (event) => {
  const { secure } = await requireUserSession(event)
  if (!secure) throw createError({ statusCode: 401, message: "Unauthorized" })

  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const daily = await getTotalByRange(todayStart, todayEnd, secure.organisationId)
  const month = await getTotalByRange(startOfMonth(todayStart), endOfMonth(todayEnd), secure.organisationId)
  const quarter = await getTotalByRange(startOfQuarter(todayStart), endOfQuarter(todayEnd), secure.organisationId)
  const year = await getTotalByRange(startOfYear(todayStart), endOfYear(todayEnd), secure.organisationId)

  const docs = await useDrizzle()
    .select({
      id: documents.id,
      status: documents.status,
    })
    .from(documents)
    .where(
      and(
        or(eq(documents.status, "unmatched"), eq(documents.status, "matched")),
        eq(documents.type, "bank-transaction"),
        eq(documents.organisationId, secure.organisationId),
        isNull(documents.deletedAt),
      ),
    )

  const matched = docs.filter((doc) => doc.status === "matched").length
  const unmatched = docs.filter((doc) => doc.status === "unmatched").length

  return {
    turnover: [
      {
        name: format(today, "eeee, dd. MMMM"),
        value: parseFloat(daily),
      },
      {
        name: format(today, "MMMM"),
        value: parseFloat(month),
      },
      {
        name: format(today, "QQQ, yyyy"),
        value: parseFloat(quarter),
      },
      {
        name: format(today, "yyyy"),
        value: parseFloat(year),
      },
    ],
    score: [
      {
        name: "Matched",
        value: matched,
        type: "positive",
      },
      {
        name: "Unmatched",
        value: unmatched,
        type: "negative",
      },
      {
        name: "Percentage",
        value: Math.round((matched / (matched + unmatched)) * 100),
        type: "percentage",
      },
    ],
  }
})

async function getTotalByRange(start: Date, end: Date, organisationId: string) {
  const [result] = await useDrizzle()
    .select({
      sum: sum(documents.amount),
    })
    .from(documents)
    .where(
      and(
        gte(documents.date, formatISO(start)),
        lte(documents.date, formatISO(end)),
        eq(documents.type, "bank-transaction"),
        eq(documents.organisationId, organisationId),
        isNull(documents.deletedAt),
      ),
    )
  return result.sum ?? 0
}
