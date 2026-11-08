export function totalUnits(units: number[]): number {
  return units.reduce((a, b) => a + b, 0)
}
