import type { Album, AlbumDisc } from '../types/album'
import { getCaseDepth } from './album'

const styles = [
  { id: 'dusk', color: '#536f78', ink: '#f3eee0', accent: '#e4b88c' },
  { id: 'orbit', color: '#383f56', ink: '#f0eadb', accent: '#c7a778' },
  { id: 'arch', color: '#9a5546', ink: '#fff0d8', accent: '#d5b68e' },
  { id: 'waves', color: '#3e625a', ink: '#f2eedc', accent: '#9ab49a' },
  { id: 'tiles', color: '#635f4d', ink: '#f2ead7', accent: '#c38a6c' },
] as const

export type CoverStyle = (typeof styles)[number]
type ArtworkDetails = Pick<Album, 'title' | 'artist' | 'year' | 'genre' | 'color' | 'ink' | 'coverUrl' | 'discs' | 'spineWidthMm'>

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

function text(value: string, y: number, size: number, font = 'Arial, sans-serif', x = 40, maxWidth = 520): string {
  const width = Array.from(value).reduce((sum, character) => sum + (/^[\x00-\x7f]$/.test(character) ? 0.6 : 1), 0) * size
  const fit = width > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}"${fit}>${escapeXml(value)}</text>`
}

function centeredText(value: string, y: number, size: number, maxWidth: number, font = 'Arial, sans-serif'): string {
  // 采用保守字宽，避免 W 等宽字母被低估后超出印刷区域。
  const fit = Array.from(value).length * size > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''
  return `<text x="0" y="${y}" font-family="${font}" font-size="${size}"${fit}>${escapeXml(value)}</text>`
}

function svgUrl(svg: string): string {
  // 图片也用于 CSS url()，额外转义括号等字符，避免专辑信息破坏背景图片地址。
  return prefix + encodeURIComponent(svg).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
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
  return svgUrl(svg)
}

export function getDiscArtwork(
  album: ArtworkDetails,
  disc: AlbumDisc,
): string {
  if (disc.labelUrl) return disc.labelUrl
  const style = getGeneratedCoverStyle(album.coverUrl)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const accent = style?.accent ?? ink
  const discs = album.discs?.length ? album.discs : [disc]
  const number = discs.findIndex((item) => item.id === disc.id) + 1
  const designs: Record<CoverStyle['id'], string> = {
    dusk: '<path d="M65 320Q180 210 300 320T535 320M65 350Q180 240 300 350T535 350"/>',
    orbit: '<circle cx="300" cy="300" r="120"/><ellipse cx="300" cy="300" rx="235" ry="90"/>',
    arch: '<path d="M115 375V300A185 185 0 0 1 485 300V375M155 375V300A145 145 0 0 1 445 300V375"/>',
    waves: [255, 300, 345].map((y) => `<path d="M65 ${y}Q180 ${y - 50} 300 ${y}T535 ${y}"/>`).join(''),
    tiles: '<path d="M100 245H220V365H100ZM380 245H500V365H380Z"/><circle cx="300" cy="300" r="140"/>',
  }
  // 文字放在圆形安全区内，避开中央直径约 21% 的盘毂及外缘。
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-disc="${style?.id ?? 'custom'}" width="1000" height="1000" viewBox="0 0 600 600">
    <defs><mask id="disc-print"><circle cx="300" cy="300" r="300" fill="white"/><circle cx="300" cy="300" r="66" fill="black"/></mask></defs>
    <g mask="url(#disc-print)">
      <circle cx="300" cy="300" r="300" fill="${color}"/>
      <g fill="none" stroke="${accent}" stroke-width="3" opacity=".35">${designs[style?.id ?? 'orbit']}</g>
      <g fill="none" stroke="${ink}" opacity=".4"><circle cx="300" cy="300" r="265"/><circle cx="300" cy="300" r="82"/></g>
      <g fill="${ink}" text-anchor="middle" transform="translate(300 0)">
        ${centeredText(album.artist, 150, 17, 330)}
        ${centeredText(album.title, 195, 32, 360, 'Georgia, serif')}
        ${centeredText(disc.title ?? 'COMPACT DISC · DIGITAL AUDIO', 420, 13, 340)}
        ${centeredText(`DISC ${number} / ${discs.length}`, 454, 19, 300)}
        ${centeredText(`${album.year} · ${album.genre}`, 484, 12, 250)}
      </g>
    </g>
  </svg>`)
}

export function getBackCoverArtwork(album: ArtworkDetails & Pick<Album, 'backCoverUrl' | 'tracks'>): string {
  if (album.backCoverUrl) return album.backCoverUrl
  const style = getGeneratedCoverStyle(album.coverUrl)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const count = album.discs?.length || 1
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-back="${style?.id ?? 'custom'}" width="1380" height="1180" viewBox="0 0 690 590">
    <rect width="690" height="590" fill="${color}"/>
    <rect x="18" y="18" width="654" height="554" fill="none" stroke="${ink}" opacity=".3"/>
    <g fill="none" stroke="${style?.accent ?? ink}" opacity=".15"><circle cx="620" cy="295" r="140"/><circle cx="620" cy="295" r="110"/></g>
    <g fill="${ink}">
      ${text(album.artist, 65, 18)}
      ${text(album.title, 112, 32, 'Georgia, serif')}
      ${text('ORIGINAL RECORDINGS', 150, 11)}
      ${album.tracks.slice(0, 12).map((track, index) => `
        ${text(`${String(index + 1).padStart(2, '0')}  ${track.title}`, 190 + index * 28, 14, 'Arial, sans-serif', 40, 450)}
        <g text-anchor="end">${text(track.duration ?? '', 190 + index * 28, 12, 'Arial, sans-serif', 650, 55)}</g>
      `).join('')}
      ${text(`${album.year} · ${count} ${count === 1 ? 'CD' : 'CDs'} · ${album.genre}`, 555, 11)}
    </g>
  </svg>`)
}

export function getObiArtwork(album: ArtworkDetails & Pick<Album, 'obiUrl'>): string {
  if (album.obiUrl) return album.obiUrl
  const style = getGeneratedCoverStyle(album.coverUrl)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const depth = getCaseDepth(album) + 8
  const width = 92 + depth
  const count = album.discs?.length || 1
  const discLabel = `${album.year} · ${count} ${count === 1 ? 'CD' : 'CDs'}`
  const panel = (side: 'back' | 'spine' | 'front', x: number, panelWidth: number) => {
    const spine = side === 'spine'
    const paper = side === 'back' ? '#e9e0c8' : spine ? '#e2d8bd' : '#eee6cd'
    return `<g data-obi-panel="${side}" transform="translate(${x} 0)">
      <rect width="${panelWidth}" height="304" fill="${paper}"/>
      <rect y="24" width="${panelWidth}" height="17" fill="${color}"/>
      <g transform="translate(${panelWidth / 2} 0)" text-anchor="middle">
        <g fill="${color}">${centeredText('COMPACT DISC', 15, 4.5, panelWidth - 8)}</g>
        <g fill="${ink}">${centeredText('STEREO', 35, 6, panelWidth - 8)}</g>
        <g fill="${color}">
          ${centeredText('ORIGINAL RECORDINGS', 274, 4.5, panelWidth - 8)}
          ${centeredText(discLabel, 288, 5.5, panelWidth - 8)}
          ${centeredText(album.genre, 299, 5, panelWidth - 8)}
        </g>
      </g>
      <g fill="${color}" text-anchor="middle" writing-mode="vertical-rl" style="text-orientation:mixed">
        <g transform="translate(${spine ? panelWidth / 2 : 16} 0)">
          ${centeredText(side === 'back' ? album.artist : album.title, 150, spine ? 12 : 15, 188, 'Georgia, serif')}
        </g>
        ${spine ? '' : `<g transform="translate(36 0)">${centeredText(side === 'front' ? album.artist : discLabel, 150, 7, 188)}</g>`}
      </g>
      <circle cx="${panelWidth / 2}" cy="250" r="4" fill="${style?.accent ?? color}"/>
      <path d="M4 263H${panelWidth - 4}" stroke="${color}" opacity=".45"/>
    </g>`
  }
  // 展开图按后折页、侧脊、前折页排列，使用与 3D 纸带一致的实际尺寸。
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-obi="${style?.id ?? 'custom'}" width="${width * 3}" height="912" viewBox="0 0 ${width} 304">
    ${panel('back', 0, 46)}
    ${panel('spine', 46, depth)}
    ${panel('front', 46 + depth, 46)}
    <path d="M46 0V304M${46 + depth} 0V304" fill="none" stroke="${color}" stroke-dasharray="2 3" opacity=".25"/>
  </svg>`)
}

export function getInnerArtwork(
  album: ArtworkDetails & Pick<Album, 'bookletBackUrl' | 'backInsideUrl'>,
  side: 'booklet' | 'back',
): string {
  const uploaded = side === 'booklet' ? album.bookletBackUrl : album.backInsideUrl
  if (uploaded) return uploaded
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const width = side === 'back' ? 690 : 600
  const height = side === 'back' ? 590 : 600
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-inside="${side}" width="${side === 'back' ? 1380 : 1000}" height="${side === 'back' ? 1180 : 1000}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${color}"/>
    <g fill="none" stroke="${ink}" opacity=".25"><circle cx="${width / 2}" cy="285" r="170"/><circle cx="${width / 2}" cy="285" r="130"/><path d="M40 460H${width - 40}"/></g>
    <g fill="${ink}">
      ${text(side === 'booklet' ? 'BOOKLET' : 'ORIGINAL RECORDINGS', 65, 14)}
      ${text(album.title, 510, 32, 'Georgia, serif')}
      ${text(album.artist, 548, 16)}
      ${text(`${album.year} · ${album.genre}`, 575, 10)}
    </g>
  </svg>`)
}

export function getSpineArtwork(
  album: ArtworkDetails & Pick<Album, 'spineUrl' | 'rightSpineUrl'>,
  side: 'left' | 'right',
): string {
  const uploaded = side === 'left' ? album.spineUrl : album.rightSpineUrl
  if (uploaded) return uploaded
  const width = getCaseDepth(album) * 2
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-spine="${side}" width="${width * 3}" height="1800" viewBox="0 0 ${width} 600">
    <rect width="${width}" height="600" fill="${escapeXml(album.color)}"/>
    <g fill="${escapeXml(album.ink)}" text-anchor="middle" writing-mode="vertical-rl" transform="translate(${width / 2} 0)">
      ${centeredText(`${album.artist} · ${album.title}`, 300, 18, 520)}
    </g>
  </svg>`)
}
