/**
 * utils.ts — Shared utility helpers.
 *
 * `cn` merges Tailwind class strings safely:
 *   - clsx handles conditional/array class inputs
 *   - twMerge deduplicates conflicting Tailwind utilities
 *     (e.g. `p-2 p-4` → `p-4`)
 *
 * Import this wherever dynamic className construction is needed.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge and deduplicate Tailwind class names. Accepts any clsx-compatible input. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
