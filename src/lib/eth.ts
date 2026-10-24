const SCALE = 18
const FACTOR = 10n ** BigInt(SCALE)

export function parseEth(value: string): bigint {
  const normalized = value.trim()
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized)
  if (!match) throw new Error(`Valor ETH inválido: ${value}`)
  const fraction = (match[2] ?? "").slice(0, SCALE).padEnd(SCALE, "0")
  return BigInt(match[1]) * FACTOR + BigInt(fraction || "0")
}

export function formatEth(value: bigint, digits = 3): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const decimalFactor = 10n ** BigInt(digits)
  const quantum = FACTOR / decimalFactor
  const rounded = (absolute + quantum / 2n) / quantum
  const whole = rounded / decimalFactor
  const decimal = digits ? (rounded % decimalFactor).toString().padStart(digits, "0") : ""
  return `${negative ? "-" : ""}${whole}${digits ? `.${decimal}` : ""}`
}

export const multiplyEth = (value: string, quantity: number) => parseEth(value) * BigInt(quantity)
export const discountEth = (value: bigint, percent: bigint) => value * percent / 100n
