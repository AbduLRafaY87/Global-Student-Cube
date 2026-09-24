/** ISO 4217 minor units we treat explicitly. All others display with two decimals. */
export const MINOR_UNITS: Record<string, number> = {
  BHD: 3,
  CLP: 0,
  JPY: 0,
  KRW: 0,
  KWD: 3,
  OMR: 3,
  TND: 3,
  VND: 0,
};

export const ANNUAL_COMPARISON_LABEL = "Tuition and accommodation estimate";

export function minorUnits(currency: string): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

export function displayMoneyAmount(amount: number, currency: string): string {
  return amount.toFixed(minorUnits(currency));
}

export function displayMoneyLine(amount: number | null, currency: string | null): string {
  if (amount === null || !currency) {
    return "Not provided";
  }
  return `${displayMoneyAmount(amount, currency)} ${currency}`;
}
