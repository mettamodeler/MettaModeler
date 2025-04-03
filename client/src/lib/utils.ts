import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts any ID type (number, string, etc.) to a string
 * This helps with mixed type issues between client and server models
 */
export function toStringId(id: any): string {
  return String(id || '');
}
