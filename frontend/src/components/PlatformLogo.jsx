import binanceLogo from '../assets/logos/binance.svg'
import hyperliquidLogo from '../assets/logos/hyperliquid.svg'
import injectiveLogo from '../assets/logos/injective.svg'
import polymarketLogo from '../assets/logos/polymarket.svg'

const LOGOS = {
  hyperliquid: { src: hyperliquidLogo, name: 'Hyperliquid' },
  injective: { src: injectiveLogo, name: 'Injective' },
  polymarket: { src: polymarketLogo, name: 'Polymarket' },
  binance: { src: binanceLogo, name: 'Binance' },
}

export function getPlatformName(platform) {
  return LOGOS[platform]?.name || platform
}

export default function PlatformLogo({ platform, size = 18, muted = false, style }) {
  const logo = LOGOS[platform]

  if (!logo) return null

  return (
    <img
      src={logo.src}
      alt={`${logo.name} logo`}
      style={{
        width: size,
        height: size,
        display: 'block',
        objectFit: 'contain',
        opacity: muted ? 0.62 : 1,
        filter: muted ? 'saturate(0.45)' : 'none',
        ...style,
      }}
    />
  )
}
