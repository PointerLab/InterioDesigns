/** Monthly instalment for a loan: P × r × (1 + r)^n / ((1 + r)^n − 1), with r the monthly rate. */
export function monthlyEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const rate = annualRatePct / 12 / 100;
  if (rate === 0) return principal / months;
  const growth = (1 + rate) ** months;
  return (principal * rate * growth) / (growth - 1);
}
