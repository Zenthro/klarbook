export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-"
  if (typeof date === "string") {
    date = new Date(date)
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
