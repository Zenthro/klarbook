export function paddNumber(number: number | string, padding: number) {
  try {
    switch (typeof number) {
      case "string":
        number = parseFloat(number)
        break
      case "number":
        break
      default:
        throw new Error("Invalid number type")
    }

    return number.toString().padStart(padding, "0")
  } catch (error) {
    console.error(number, error)
    return "0"
  }
}
