import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a numeric value as a price string in Philippine Peso (2 decimal places).
 * Uses "PHP" prefix instead of the ₱ symbol because the peso sign (U+20B1) is missing
 * from most common fonts (Inter, system UI), causing uneven font fallback rendering.
 * Returns the fallback (default "PHP 0.00") if the value is undefined, null, NaN, or not a number.
 * Pass `includePrefix: false` to get just the number (e.g. "10.50" instead of "PHP 10.50").
 * Prevents "Cannot read properties of undefined (reading 'toFixed')" errors at render time.
 */
/**
 * Formats a date string as a relative time (e.g. "2m ago", "1h ago", "3d ago").
 */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function formatPrice(value: unknown, includePrefix = true, fallback = "PHP 0.00"): string {
  if (value == null) return fallback
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return fallback
  const formatted = num.toFixed(2)
  return includePrefix ? `PHP ${formatted}` : formatted
}
