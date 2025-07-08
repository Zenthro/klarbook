export function formatIBAN(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim()
}
