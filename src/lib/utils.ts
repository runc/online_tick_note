import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shared top bar height so sidebar and main header borders align */
export const APP_HEADER_BAR = 'flex h-12 shrink-0 items-center border-b border-border px-4'
