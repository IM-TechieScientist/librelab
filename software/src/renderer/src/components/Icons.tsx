import {
  Binary,
  Cable,
  Cpu,
  Plus,
  Play,
  Ruler,
  SendHorizontal,
  SlidersHorizontal,
  Square,
  X,
  type LucideIcon
} from 'lucide-react'

interface IconOptions {
  size?: number
}

function icon(Component: LucideIcon, options: IconOptions = {}): () => React.JSX.Element {
  return () => <Component aria-hidden="true" size={options.size ?? 18} strokeWidth={1.8} />
}

export const Icons = {
  device: icon(Cpu),
  sliders: icon(SlidersHorizontal),
  decode: icon(Binary),
  measure: icon(Ruler),
  output: icon(SendHorizontal),
  bus: icon(Cable),
  play: icon(Play, { size: 20 }),
  stop: icon(Square),
  close: icon(X, { size: 14 }),
  plus: icon(Plus, { size: 16 })
}
