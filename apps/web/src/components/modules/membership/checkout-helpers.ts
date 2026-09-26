export const currentReturnPath = () =>
  typeof window === 'undefined'
    ? undefined
    : window.location.pathname + window.location.search

export const formatCurrency = (
  amount: number,
  currency: string,
  locale: string,
) => {
  try {
    const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency })
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2
    return fmt.format(amount / 10 ** digits)
  } catch {
    return `${amount}`
  }
}
