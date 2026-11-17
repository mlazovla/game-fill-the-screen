import type { SymbolName } from './symbols'

const polar = (count: number, radius: (i: number) => number, offsetY = 0) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2
    return `${(radius(i) * Math.cos(angle)).toFixed(2)},${(radius(i) * Math.sin(angle) + offsetY).toFixed(2)}`
  }).join(' ')

const STAR_POINTS = polar(10, (i) => (i % 2 === 0 ? 42 : 18), 3)
const HEXAGON_POINTS = polar(6, () => 42)
const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300]

function Shape({ name }: { name: SymbolName }) {
  switch (name) {
    case 'circle':
      return <circle r="36" />
    case 'star':
      return <polygon points={STAR_POINTS} />
    case 'cross':
      return (
        <g transform="rotate(45)">
          <rect x="-44" y="-9" width="88" height="18" rx="2" />
          <rect x="-9" y="-44" width="18" height="88" rx="2" />
        </g>
      )
    case 'triangle':
      return <polygon points="0,-38 40,32 -40,32" />
    case 'tree':
      return (
        <>
          <polygon points="0,-46 22,-16 11,-16 30,8 16,8 36,32 -36,32 -16,8 -30,8 -11,-16 -22,-16" />
          <rect x="-7" y="31" width="14" height="14" />
        </>
      )
    case 'clover':
      return (
        <>
          <circle cx="0" cy="-21" r="17" />
          <circle cx="21" cy="0" r="17" />
          <circle cx="0" cy="21" r="17" />
          <circle cx="-21" cy="0" r="17" />
          <circle r="12" />
          <path d="M8 8 Q 26 26 30 46" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </>
      )
    case 'sun':
      return (
        <>
          <circle r="20" />
          {RAY_ANGLES.map((angle) => (
            <rect key={angle} x="-4" y="-46" width="8" height="17" rx="3" transform={`rotate(${angle})`} />
          ))}
        </>
      )
    case 'flower':
      return (
        <>
          {PETAL_ANGLES.map((angle) => (
            <ellipse key={angle} cx="0" cy="-25" rx="12" ry="18" transform={`rotate(${angle})`} />
          ))}
          <circle r="10" fill="#000" />
        </>
      )
    case 'elephant':
      return (
        <>
          <ellipse cx="10" cy="-2" rx="30" ry="21" />
          <circle cx="-20" cy="-10" r="17" />
          <path d="M-32 -6 Q -44 14 -36 32" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          <rect x="-10" y="8" width="11" height="30" rx="2" />
          <rect x="5" y="8" width="11" height="30" rx="2" />
          <rect x="20" y="8" width="11" height="30" rx="2" />
          <path d="M39 -8 Q 46 2 44 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M-12 -18 Q -2 -8 -10 6" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <circle cx="-25" cy="-14" r="2.5" fill="#000" />
        </>
      )
    case 'moon':
      return (
        <>
          <circle r="38" />
          <circle cx="18" cy="-12" r="32" fill="#000" />
        </>
      )
    case 'hexagon':
      return <polygon points={HEXAGON_POINTS} />
    case 'bolt':
      return <polygon points="12,-46 -26,6 -3,6 -12,46 26,-8 3,-8 18,-46" />
  }
}

export function PexesoSymbol({ name, className }: { name: SymbolName; className?: string }) {
  return (
    <svg className={className} viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true">
      <Shape name={name} />
    </svg>
  )
}
