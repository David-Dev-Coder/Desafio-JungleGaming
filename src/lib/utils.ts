import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function tokenIndex(id: string) {
  const digits = id.match(/(\d+)$/)?.[1]
  return digits ? `#${digits.padStart(4, '0')}` : `#${id.slice(-4)}`
}
