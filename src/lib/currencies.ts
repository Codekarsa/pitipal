import { CircleDollarSign, DollarSign, Euro, PoundSterling } from "lucide-react";

export const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  { code: "EUR", symbol: "€", name: "Euro", icon: Euro },
  { code: "GBP", symbol: "£", name: "British Pound", icon: PoundSterling },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", icon: CircleDollarSign },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", icon: CircleDollarSign },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", icon: DollarSign },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", icon: CircleDollarSign },
  { code: "THB", symbol: "฿", name: "Thai Baht", icon: CircleDollarSign },
  { code: "KRW", symbol: "₩", name: "South Korean Won", icon: CircleDollarSign },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", icon: CircleDollarSign },
  { code: "INR", symbol: "₹", name: "Indian Rupee", icon: CircleDollarSign },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", icon: DollarSign },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", icon: DollarSign },
];
