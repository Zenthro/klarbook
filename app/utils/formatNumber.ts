export function formatNumber(value: number | null | undefined) {
  const formatted = Intl.NumberFormat("de-De", {
    currency: "EUR",
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
  return formatted
}
