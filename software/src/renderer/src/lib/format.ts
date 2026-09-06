export function formatFrequency(value: number): string {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)} MHz`
  if (value >= 1_000) return `${trim(value / 1_000)} kHz`
  return `${trim(value)} Hz`
}

export function formatDuration(seconds: number): string {
  const absolute = Math.abs(seconds)
  if (absolute >= 1) return `${trim(seconds)} s`
  if (absolute >= 1e-3) return `${trim(seconds * 1e3)} ms`
  if (absolute >= 1e-6) return `${trim(seconds * 1e6)} µs`
  return `${trim(seconds * 1e9)} ns`
}

function trim(value: number): string {
  return Number(value.toPrecision(4)).toString()
}
