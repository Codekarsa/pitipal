import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Rupiah amounts are not written with cents
  const fractionDigits = currency === 'IDR' ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

// Shortens amounts of 100 million or more (e.g. "IDR 150M") so they fit in narrow cards
export function formatCompactCurrency(amount: number, currency: string = 'USD'): string {
  if (Math.abs(amount) < 100_000_000) return formatCurrency(amount, currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
