import type { Album } from '../types/album'

const styles = [
  { id: 'dusk', color: '#536f78', ink: '#f3eee0', accent: '#e4b88c' },
  { id: 'orbit', color: '#383f56', ink: '#f0eadb', accent: '#c7a778' },
  { id: 'arch', color: '#9a5546', ink: '#fff0d8', accent: '#d5b68e' },
  { id: 'waves', color: '#3e625a', ink: '#f2eedc', accent: '#9ab49a' },
  { id: 'tiles', color: '#635f4d', ink: '#f2ead7', accent: '#c38a6c' },
] as const

export type CoverStyle = (typeof styles)[number]

const prefix = 'data:image/svg+xml;charset=utf-8,'
const opening = (style: CoverStyle) =>
  `<svg xmlns="http://www.w3.org/2000/svg" data-cd-cover="${style.id}"`

export function getGeneratedCoverStyle(url: string): CoverStyle | null {
  return styles.find((style) => url.startsWith(prefix + encodeURIComponent(opening(style)))) ?? null
}

export function randomCoverStyle(previous?: CoverStyle | null): CoverStyle {
  const choices = styles.filter((style) => style.id !== previous?.id)
  return choices[Math.floor(Math.random() * choices.length)]
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!)
}

function text(value: string, y: number, size: number, font = 'Arial, sans-serif'): string {
  const width = Array.from(value).reduce((sum, character) => sum + (/^[\x00-\x7f]$/.test(character) ? 0.6 : 1), 0) * size
  const fit = width > 520 ? ' textLength="520" lengthAdjust="spacingAndGlyphs"' : ''
  return `<text x="40" y="${y}" font-family="${font}" font-size="${size}"${fit}>${escapeXml(value)}</text>`
}

export function generateCover(
  details: Pick<Album, 'title' | 'artist' | 'year' | 'genre'>,
  style: CoverStyle,
): string {
  const { color, ink, accent } = style
  const designs: Record<CoverStyle['id'], string> = {
    dusk: `<circle cx="300" cy="265" r="116" fill="${accent}"/>
      <path d="M0 340Q150 245 300 350T600 315V450H0Z" fill="${color}"/>
      <path d="M0 395Q170 310 360 405T600 365" fill="none" stroke="${ink}" stroke-width="2" opacity=".5"/>`,
    orbit: `<g fill="none" stroke="${accent}">
      <circle cx="300" cy="285" r="125" stroke-width="2"/>
      <ellipse cx="300" cy="285" rx="190" ry="58" transform="rotate(-30 300 285)"/>
      <ellipse cx="300" cy="285" rx="190" ry="58" transform="rotate(30 300 285)"/>
      </g><circle cx="300" cy="285" r="38" fill="${ink}"/><circle cx="461" cy="193" r="12" fill="${accent}"/>`,
    arch: `<path d="M170 415V265A130 130 0 0 1 430 265V415Z" fill="${accent}"/>
      <path d="M210 415V270A90 90 0 0 1 390 270V415Z" fill="${color}"/>
      <circle cx="300" cy="300" r="46" fill="${ink}"/>
      <path d="M135 415H465" stroke="${ink}" stroke-width="2"/>`,
    waves: `<g fill="none" stroke="${accent}" stroke-width="14">
      ${[180, 230, 280, 330, 380].map((y) => `<path d="M60 ${y}Q180 ${y - 65} 300 ${y}T540 ${y}"/>`).join('')}
      </g><circle cx="465" cy="155" r="24" fill="${ink}"/>`,
    tiles: `<rect x="155" y="150" width="140" height="140" fill="${ink}"/>
      <circle cx="370" cy="220" r="70" fill="${accent}"/>
      <path d="M155 305H295V445Z" fill="${accent}"/>
      <path d="M305 445V375A70 70 0 0 1 445 375V445Z" fill="${ink}"/>`,
  }
  const svg = `${opening(style)} width="1000" height="1000" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${color}"/>
    <rect x="18" y="18" width="564" height="564" fill="none" stroke="${ink}" opacity=".3"/>
    ${designs[style.id]}
    <g fill="${ink}">
      ${text(details.artist, 65, 18)}
      ${text(details.title, 523, 40, 'Georgia, serif')}
      ${text(`${details.year} · ${details.genre} · STEREO`, 560, 11)}
    </g>
  </svg>`
  // 封面也用于 CSS url()，额外转义括号等字符，避免专辑信息破坏背景图片地址。
  return prefix + encodeURIComponent(svg).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}
