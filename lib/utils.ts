import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a numeric value as a price string in Philippine Peso (2 decimal places).
 * Returns the fallback (default "₱0.00") if the value is undefined, null, NaN, or not a number.
 * Pass `includePrefix: false` to get just the number (e.g. "10.50" instead of "₱10.50").
 * Prevents "Cannot read properties of undefined (reading 'toFixed')" errors at render time.
 */
export function formatPrice(value: unknown, includePrefix = true, fallback = "₱0.00"): string {
  if (value == null) return fallback
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return fallback
  const formatted = num.toFixed(2)
  return includePrefix ? `₱${formatted}` : formatted
}
