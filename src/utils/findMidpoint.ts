export default function findMidpoint(
  low: number | string,
  high: number | string
): number {
  // Convert inputs to numbers in case they are strings
  const numericLow = Number(low);
  const numericHigh = Number(high);

  // Calculate the midpoint
  const midPoint = (numericLow + numericHigh) / 2;

  // Round the midpoint to the nearest whole number
  const roundedMidPoint = Math.round(midPoint);

  return roundedMidPoint;
}

