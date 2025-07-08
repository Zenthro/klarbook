const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// Pre-computed lookup table for base58 decoding
const B58_MAP = new Uint8Array(256).fill(255)
for (let i = 0; i < ALPHABET.length; i++) {
  B58_MAP[ALPHABET.charCodeAt(i)] = i
}

/**
 * Converts a UUID string to base58
 * @param uuid UUID string (with or without hyphens)
 * @returns base58 encoded string
 */
export function uuidToBase58(uuid: string): string {
  // Remove hyphens and validate length
  const cleanUuid = uuid.replace(/-/g, "")
  if (cleanUuid.length !== 32) {
    throw new Error("Invalid UUID format")
  }

  // Convert UUID hex string to bytes
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanUuid.slice(i * 2, i * 2 + 2), 16)
  }

  // Convert bytes to BigInt
  let x = bytesToBigInt(bytes)
  const result: number[] = []

  // Pre-computed BigInt(58^10)
  const BIG_RADIX_10 = BigInt(58 ** 10)

  while (x > BigInt(0)) {
    const mod = x % BIG_RADIX_10
    x = x / BIG_RADIX_10

    if (x === BigInt(0)) {
      // Last chunk - only encode significant digits
      let m = Number(mod)
      while (m > 0) {
        result.push(m % 58)
        m = Math.floor(m / 58)
      }
    } else {
      // Encode all 10 digits
      let m = Number(mod)
      for (let i = 0; i < 10; i++) {
        result.push(m % 58)
        m = Math.floor(m / 58)
      }
    }
  }

  // Add leading zeros
  for (const byte of bytes) {
    if (byte !== 0) break
    result.push(0)
  }

  // Reverse and convert to string
  return result
    .reverse()
    .map((v) => ALPHABET[v])
    .join("")
}

/**
 * Converts a base58 string back to a UUID string
 * @param base58 base58 encoded string
 * @returns UUID string with hyphens
 */
export function base58ToUuid(base58: string): string {
  let answer = BigInt(0)

  // Process the input string in chunks of up to 10 characters
  for (let i = 0; i < base58.length; ) {
    const chunkSize = Math.min(10, base58.length - i)
    const chunk = base58.slice(i, i + chunkSize)

    let total = BigInt(0)
    for (const char of chunk) {
      const charCode = char.charCodeAt(0)
      if (charCode > 255) throw new Error("Invalid base58 string")

      const value = B58_MAP[charCode]
      if (value === 255) throw new Error("Invalid base58 string")

      total = total * BigInt(58) + BigInt(value)
    }

    const bigRadix = BigInt(58 ** chunkSize)
    answer = answer * bigRadix + total
    i += chunkSize
  }

  // Convert to hex string and pad to 32 characters
  const hex = answer.toString(16).padStart(32, "0")

  // Format as UUID
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Helper function
function bytesToBigInt(bytes: Uint8Array): BigInt {
  let hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return hex === "" ? BigInt(0) : BigInt("0x" + hex)
}
