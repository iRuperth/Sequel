export const LOCALE = "en-US"
export const HTML_LANG = "en"
export const DEFAULT_CURRENCY = "USD"

export const DATE_FORMATS = {
  dateTime: { dateStyle: "medium", timeStyle: "short" },
  dateTimeSeconds: { dateStyle: "medium", timeStyle: "medium" },
  date: { dateStyle: "medium" },
  shortDate: { month: "short", day: "numeric" },
  monthShort: { month: "short" },
  weekdayShort: { weekday: "short" },
  time: { timeStyle: "short" },
  timeSeconds: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

export const NUMBER_FORMATS = {
  integer: { maximumFractionDigits: 0 },
  decimal: { maximumFractionDigits: 2 },
  precise: { maximumFractionDigits: 4 },
  compact: { notation: "compact", maximumFractionDigits: 1 },
  percent: { style: "percent", maximumFractionDigits: 1 },
  percentWhole: { style: "percent", maximumFractionDigits: 0 },
} as const satisfies Record<string, Intl.NumberFormatOptions>

export const DURATION_UNITS = {
  millisecond: "millisecond",
  second: "second",
  minute: "minute",
  hour: "hour",
  day: "day",
} as const

export const BYTE_UNITS = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const

export const CSV_FORMAT = {
  delimiter: ",",
  lineBreak: "\r\n",
  quote: '"',
  mimeType: "text/csv;charset=utf-8",
  extension: ".csv",
} as const
