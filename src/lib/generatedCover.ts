import type { Album, AlbumDisc, ArtworkPalette, ArtworkTheme } from '../types/album'
import { getSpineDepth } from './album'
import { getObiLayout } from './obi'
import { LABEL_INNER_RATIO, LABEL_OUTER_RATIO } from './disc'

const styles = [
  { id: 'dusk', color: '#536f78', ink: '#f3eee0', accent: '#e4b88c' },
  { id: 'orbit', color: '#383f56', ink: '#f0eadb', accent: '#c7a778' },
  { id: 'arch', color: '#9a5546', ink: '#fff0d8', accent: '#d5b68e' },
  { id: 'waves', color: '#3e625a', ink: '#f2eedc', accent: '#9ab49a' },
  { id: 'tiles', color: '#635f4d', ink: '#f2ead7', accent: '#c38a6c' },
  { id: 'sunburst', color: '#b8673b', ink: '#fbf1df', accent: '#f1c46e' },
  { id: 'grid', color: '#e6e0d2', ink: '#2f3a3a', accent: '#cf5a3f' },
  { id: 'stripes', color: '#24343f', ink: '#f1ece0', accent: '#d9a441' },
  { id: 'bloom', color: '#a9666d', ink: '#fff3ea', accent: '#f1c7b6' },
  { id: 'horizon', color: '#4a4f6b', ink: '#f3ecdd', accent: '#d79a7a' },
  { id: 'monolith', color: '#222428', ink: '#ece6d8', accent: '#b8a37c' },
] as const

export const artworkThemes = ['dusk', 'orbit', 'arch', 'waves', 'tiles', 'sunburst', 'grid', 'stripes', 'bloom', 'horizon', 'monolith'] as const
export const artworkPalettes = [
  { id: 'cream', color: '#e8dfcc', ink: '#31352f', accent: '#a47b58' },
  { id: 'clay', color: '#9a5546', ink: '#fff0d8', accent: '#d5b68e' },
  { id: 'forest', color: '#3e625a', ink: '#f2eedc', accent: '#9ab49a' },
  { id: 'ocean', color: '#365c78', ink: '#f1efdf', accent: '#b6d0d2' },
  { id: 'midnight', color: '#463c65', ink: '#f5eede', accent: '#bea6cb' },
  { id: 'mustard', color: '#cf9f45', ink: '#2e2a22', accent: '#7d4f2a' },
  { id: 'rose', color: '#c48a8e', ink: '#fff4ee', accent: '#f4d3c4' },
  { id: 'sage', color: '#a7b399', ink: '#2f3a2c', accent: '#f3efe2' },
  { id: 'charcoal', color: '#25272b', ink: '#ece6d8', accent: '#c9a86a' },
] as const

export type CoverStyle = { id: ArtworkTheme; color: string; ink: string; accent: string }
type ArtworkDetails = Pick<Album, 'title' | 'artist' | 'year' | 'genre' | 'color' | 'ink' | 'coverUrl' | 'discs' | 'spineWidthMm' | 'caseThicknessMm' | 'obiDimensions' | 'artworkTheme' | 'artworkPalette'>

export function getArtworkPalette(id?: ArtworkPalette) {
  return artworkPalettes.find((palette) => palette.id === id)
}

const prefix = 'data:image/svg+xml;charset=utf-8,'
const opening = (style: CoverStyle) =>
  `<svg xmlns="http://www.w3.org/2000/svg" data-cd-cover="${style.id}"`

export function getGeneratedCoverStyle(url: string): CoverStyle | null {
  const style = styles.find((style) => url.startsWith(prefix + encodeURIComponent(opening(style))))
  if (!style) return null
  const colors = url.match(/data-cd-colors%3D%22(%23[\da-f]{6})%2C(%23[\da-f]{6})%2C(%23[\da-f]{6})%22/i)
  return colors ? { ...style, color: decodeURIComponent(colors[1]), ink: decodeURIComponent(colors[2]), accent: decodeURIComponent(colors[3]) } : style
}

export function randomCoverStyle(previous?: CoverStyle | null): CoverStyle {
  const choices = styles.filter((style) => style.id !== previous?.id)
  const style = choices[Math.floor(Math.random() * choices.length)]
  // 一半概率换用其他配色，同一图形也能有不同色调。
  if (Math.random() >= 0.5) return style
  const palette = artworkPalettes[Math.floor(Math.random() * artworkPalettes.length)]
  return { id: style.id, color: palette.color, ink: palette.ink, accent: palette.accent }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!)
}

function text(value: string, y: number, size: number, font = 'sans-serif', x = 40, maxWidth = 520): string {
  const width = Array.from(value).reduce((sum, character) => sum + (/^[\x00-\x7f]$/.test(character) ? 0.6 : 1), 0) * size
  const fit = width > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}"${fit}>${escapeXml(value)}</text>`
}

function centeredText(value: string, y: number, size: number, maxWidth: number, font = 'sans-serif'): string {
  // 采用保守字宽，避免 W 等宽字母被低估后超出印刷区域。
  const fit = Array.from(value).length * size > maxWidth ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"` : ''
  return `<text x="0" y="${y}" font-family="${font}" font-size="${size}"${fit}>${escapeXml(value)}</text>`
}

function svgUrl(svg: string): string {
  // 图片也用于 CSS url()，额外转义括号等字符，避免专辑信息破坏背景图片地址。
  return prefix + encodeURIComponent(svg).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}

function getPackagingStyle(album: ArtworkDetails): { id: CoverStyle['id']; accent: string; custom: boolean } {
  const generated = getGeneratedCoverStyle(album.coverUrl)
  const palette = getArtworkPalette(album.artworkPalette)
  const selectedTheme = artworkThemes.find((theme) => theme === album.artworkTheme)
  if (generated) return {
    id: selectedTheme ?? generated.id,
    accent: palette?.accent ?? generated.accent,
    custom: !!selectedTheme || !!palette,
  }
  if (!/^#[\da-f]{6}$/i.test(album.color)) return { id: selectedTheme ?? 'orbit', accent: palette?.accent ?? escapeXml(album.ink), custom: true }
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(album.color.slice(index, index + 2), 16))
  const max = Math.max(red, green, blue)
  const chroma = max - Math.min(red, green, blue)
  const sector = max === red ? green - blue : max === green ? blue - red : red - green
  const offset = max === red ? 0 : max === green ? 2 : 4
  const hue = chroma === 0 ? 0 : ((sector / chroma + offset) * 60 + 360) % 360
  // 低彩度使用克制的圆环；暖色用拱形与色块，冷色用波纹与弧线。
  let id: CoverStyle['id'] = 'orbit'
  if (chroma >= 24) {
    if (hue < 25 || hue >= 335) id = 'arch'
    else if (hue < 75) id = 'tiles'
    else if (hue < 170) id = 'waves'
    else if (hue < 255) id = 'dusk'
  }
  const accent = '#' + [red, green, blue].map((value, index) => {
    const ink = /^#[\da-f]{6}$/i.test(album.ink) ? Number.parseInt(album.ink.slice(index * 2 + 1, index * 2 + 3), 16) : 255
    return Math.round(value * 0.6 + ink * 0.4).toString(16).padStart(2, '0')
  }).join('')
  return { id: selectedTheme ?? id, accent: palette?.accent ?? accent, custom: true }
}

function packagingPattern(id: CoverStyle['id']): string {
  const designs: Record<CoverStyle['id'], string> = {
    dusk: '<path d="M65 320Q180 210 300 320T535 320M65 350Q180 240 300 350T535 350"/>',
    orbit: '<circle cx="300" cy="300" r="120"/><ellipse cx="300" cy="300" rx="235" ry="90"/>',
    arch: '<path d="M115 375V300A185 185 0 0 1 485 300V375M155 375V300A145 145 0 0 1 445 300V375"/>',
    waves: [255, 300, 345].map((y) => `<path d="M65 ${y}Q180 ${y - 50} 300 ${y}T535 ${y}"/>`).join(''),
    tiles: '<path d="M100 245H220V365H100ZM380 245H500V365H380Z"/><circle cx="300" cy="300" r="140"/>',
    sunburst: `<path d="M180 380A120 120 0 0 1 420 380M140 380H460"/>${[200, 220, 240, 260, 280, 300, 320, 340].map((angle) => {
      const [x, y] = [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)]
      return `<path d="M${300 + x * 140} ${380 + y * 140}L${300 + x * 205} ${380 + y * 205}"/>`
    }).join('')}`,
    grid: '<path d="M150 210H450M150 270H450M150 330H450M150 390H450M210 180V420M300 180V420M390 180V420"/><rect x="300" y="210" width="90" height="60"/>',
    stripes: '<path d="M100 400L260 200M180 400L340 200M260 400L420 200M340 400L500 200"/><circle cx="450" cy="220" r="28"/>',
    bloom: [0, 60, 120, 180, 240, 300].map((angle) => `<ellipse cx="300" cy="240" rx="30" ry="62" transform="rotate(${angle} 300 300)"/>`).join('') + '<circle cx="300" cy="300" r="24"/>',
    horizon: '<path d="M65 380L200 260L290 340L380 240L535 380M65 380H535"/><circle cx="430" cy="215" r="32"/>',
    monolith: '<rect x="255" y="175" width="100" height="215"/><rect x="235" y="195" width="100" height="215"/><path d="M130 260H200M130 280H200M130 300H200"/>',
  }
  return designs[id]
}

export function generateCover(
  details: Pick<Album, 'title' | 'artist' | 'year' | 'genre'>,
  style: CoverStyle,
): string {
  const { color, ink, accent } = style
  const original = styles.find((item) => item.id === style.id)
  // 图形和配色独立选择后，封面需携带实际配色，重新编辑时才能原样恢复。
  const colors = color === original?.color && ink === original.ink && accent === original.accent
    ? '' : ` data-cd-colors="${escapeXml(`${color},${ink},${accent}`)}"`
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
    sunburst: `<g stroke="${accent}" stroke-width="10" stroke-linecap="round">
      ${Array.from({ length: 11 }, (_, index) => {
        const angle = (190 + index * 16) * Math.PI / 180
        const [x, y] = [Math.cos(angle), Math.sin(angle)]
        return `<path d="M${300 + x * 145} ${440 + y * 145}L${300 + x * 250} ${440 + y * 250}"/>`
      }).join('')}
      </g><path d="M185 440A115 115 0 0 1 415 440Z" fill="${accent}"/>
      <path d="M95 440H505" stroke="${ink}" stroke-width="2"/>`,
    grid: `<rect x="270" y="190" width="180" height="180" fill="${accent}"/>
      <g fill="${ink}">${[130, 190, 250, 310, 370, 430].flatMap((y) => [150, 210, 270, 330, 390, 450].map((x) => `<circle cx="${x}" cy="${y}" r="5"/>`)).join('')}</g>
      <circle cx="210" cy="370" r="60" fill="none" stroke="${ink}" stroke-width="3"/>`,
    stripes: `<clipPath id="cd-stripes"><rect x="110" y="110" width="380" height="340"/></clipPath>
      <g clip-path="url(#cd-stripes)" stroke="${accent}" stroke-width="24">
      ${[-4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((index) => `<path d="M${index * 72} 450L${index * 72 + 340} 110"/>`).join('')}
      </g><circle cx="400" cy="200" r="52" fill="${ink}"/>
      <rect x="110" y="110" width="380" height="340" fill="none" stroke="${ink}" stroke-width="2"/>`,
    bloom: `<g fill="${accent}" opacity=".9">${[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => `<ellipse cx="300" cy="205" rx="40" ry="72" transform="rotate(${angle} 300 280)"/>`).join('')}</g>
      <circle cx="300" cy="280" r="40" fill="${ink}"/>
      <circle cx="300" cy="280" r="16" fill="${color}"/>`,
    horizon: `<circle cx="385" cy="215" r="58" fill="${ink}"/>
      <path d="M60 430L200 275L285 360L380 255L540 430Z" fill="${accent}"/>
      <path d="M60 430L165 350L255 410L350 340L540 430Z" fill="${ink}" opacity=".25"/>
      <path d="M60 430H540" stroke="${ink}" stroke-width="2"/>`,
    monolith: `<rect x="250" y="125" width="150" height="320" fill="${accent}"/>
      <rect x="220" y="150" width="150" height="320" fill="none" stroke="${ink}" stroke-width="2"/>
      <circle cx="455" cy="160" r="16" fill="${ink}"/>
      <path d="M120 300H190M120 318H190M120 336H190" stroke="${ink}" stroke-width="2"/>`,
  }
  const svg = `${opening(style)}${colors} width="1000" height="1000" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${color}"/>
    <rect x="18" y="18" width="564" height="564" fill="none" stroke="${ink}" opacity=".3"/>
    ${designs[style.id]}
    <g fill="${ink}">
      ${text(details.artist, 65, 18)}
      ${text(details.title, 523, 40, 'serif')}
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
  const style = getPackagingStyle(album)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const accent = style.accent
  const discs = album.discs?.length ? album.discs : [disc]
  const number = discs.findIndex((item) => item.id === disc.id) + 1
  // 只在实物的印刷范围内着色：内径 23 mm、外径 116 mm，其余保持透明。
  const inner = Math.round(LABEL_INNER_RATIO * 300 * 1000) / 1000
  const outer = Math.round(LABEL_OUTER_RATIO * 300 * 1000) / 1000
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-disc="${style.custom ? 'custom' : style.id}" width="1000" height="1000" viewBox="0 0 600 600">
    <defs><mask id="disc-print"><circle cx="300" cy="300" r="${outer}" fill="white"/><circle cx="300" cy="300" r="${inner}" fill="black"/></mask></defs>
    <g mask="url(#disc-print)">
      <circle cx="300" cy="300" r="${outer}" fill="${color}"/>
      <g fill="none" stroke="${accent}" stroke-width="3" opacity=".35">${packagingPattern(style.id)}</g>
      <g fill="none" stroke="${ink}" opacity=".4"><circle cx="300" cy="300" r="265"/><circle cx="300" cy="300" r="82"/></g>
      <g fill="${ink}" text-anchor="middle" transform="translate(300 0)">
        ${centeredText(album.artist, 150, 17, 330)}
        ${centeredText(album.title, 195, 32, 360, 'serif')}
        ${centeredText(disc.title ?? 'COMPACT DISC · DIGITAL AUDIO', 420, 13, 340)}
        ${centeredText(`DISC ${number} / ${discs.length}`, 454, 19, 300)}
        ${centeredText(`${album.year} · ${album.genre}`, 484, 12, 250)}
      </g>
    </g>
  </svg>`)
}

export function getBackCoverArtwork(album: ArtworkDetails & Pick<Album, 'backCoverUrl' | 'tracks'>): string {
  if (album.backCoverUrl) return album.backCoverUrl
  const style = getPackagingStyle(album)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const count = album.discs?.length || 1
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-back="${style.custom ? 'custom' : style.id}" width="1380" height="1180" viewBox="0 0 690 590">
    <rect width="690" height="590" fill="${color}"/>
    <rect x="18" y="18" width="654" height="554" fill="none" stroke="${ink}" opacity=".3"/>
    <g fill="none" stroke="${style.accent}" opacity=".15">${style.custom
      ? `<g transform="translate(420 115) scale(.6)" stroke-width="3">${packagingPattern(style.id)}</g>`
      : '<circle cx="620" cy="295" r="140"/><circle cx="620" cy="295" r="110"/>'}</g>
    <g fill="${ink}">
      ${text(album.artist, 65, 18)}
      ${text(album.title, 112, 32, 'serif')}
      ${text('ORIGINAL RECORDINGS', 150, 11)}
      ${album.tracks.slice(0, 12).map((track, index) => `
        ${text(`${String(index + 1).padStart(2, '0')}  ${track.title}`, 190 + index * 28, 14, 'sans-serif', 40, 450)}
        <g text-anchor="end">${text(track.duration ?? '', 190 + index * 28, 12, 'sans-serif', 650, 55)}</g>
      `).join('')}
      ${text(`${album.year} · ${count} ${count === 1 ? 'CD' : 'CDs'} · ${album.genre}`, 555, 11)}
    </g>
  </svg>`)
}

export function getObiArtwork(album: ArtworkDetails & Pick<Album, 'obiUrl'>): string {
  if (album.obiUrl) return album.obiUrl
  const style = getPackagingStyle(album)
  const color = escapeXml(album.color)
  const ink = escapeXml(album.ink)
  const layout = getObiLayout(album)
  const depth = layout.depth
  const width = layout.width
  const count = album.discs?.length || 1
  const discLabel = `${album.year} · ${count} ${count === 1 ? 'CD' : 'CDs'}`
  const panel = (side: 'back' | 'spine' | 'front', x: number, panelWidth: number) => {
    const spine = side === 'spine'
    const fontScale = spine ? 1 : Math.min(1, panelWidth / 46)
    const paper = style.custom ? color : side === 'back' ? '#e9e0c8' : spine ? '#e2d8bd' : '#eee6cd'
    const print = style.custom ? ink : color
    return `<g data-obi-panel="${side}" transform="translate(${x} 0)${layout.height === 304 ? '' : ` scale(1 ${layout.height / 304})`}">
      <rect width="${panelWidth}" height="304" fill="${paper}"/>
      <rect y="24" width="${panelWidth}" height="17" fill="${print}"/>
      <g transform="translate(${panelWidth / 2} 0)" text-anchor="middle">
        <g fill="${print}">${centeredText('COMPACT DISC', 15, 4.5, panelWidth - 8)}</g>
        <g fill="${style.custom ? color : ink}">${centeredText('STEREO', 35, 6, panelWidth - 8)}</g>
        <g fill="${print}">
          ${centeredText('ORIGINAL RECORDINGS', 274, 4.5, panelWidth - 8)}
          ${centeredText(discLabel, 288, 5.5, panelWidth - 8)}
          ${centeredText(album.genre, 299, 5, panelWidth - 8)}
        </g>
      </g>
      <g fill="${print}" text-anchor="middle" writing-mode="vertical-rl" style="text-orientation:mixed">
        <g transform="translate(${spine ? panelWidth / 2 : panelWidth * 16 / 46} 0)">
          ${centeredText(side === 'back' ? album.artist : album.title, 150, (spine ? 12 : 15) * fontScale, 188, 'serif')}
        </g>
        ${spine ? '' : `<g transform="translate(${panelWidth * 36 / 46} 0)">${centeredText(side === 'front' ? album.artist : discLabel, 150, 7 * fontScale, 188)}</g>`}
      </g>
      ${album.artworkTheme ? `<g transform="translate(${panelWidth / 2} 250) scale(${Math.min(panelWidth - 8, 36) / 600}) translate(-300 -300)" fill="none" stroke="${style.accent}" stroke-width="8">${packagingPattern(style.id)}</g>`
        : `<circle cx="${panelWidth / 2}" cy="250" r="4" fill="${style.accent}"/>`}
      <path d="M4 263H${panelWidth - 4}" stroke="${print}" opacity=".45"/>
    </g>`
  }
  // 展开图按后折页、侧脊、前折页排列，使用与 3D 纸带一致的实际尺寸。
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-obi="${style.custom ? 'custom' : style.id}" width="${width * 3}" height="${layout.height * 3}" viewBox="0 0 ${width} ${layout.height}">
    ${panel('back', 0, layout.backWidth)}
    ${panel('spine', layout.backWidth, depth)}
    ${panel('front', layout.backWidth + depth, layout.frontWidth)}
    <path d="M${layout.backWidth} 0V${layout.height}M${layout.backWidth + depth} 0V${layout.height}" fill="none" stroke="${style.custom ? ink : color}" stroke-dasharray="2 3" opacity=".25"/>
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
  const style = getPackagingStyle(album)
  if (side === 'back') return insideBackArtwork(album, style, color, ink)
  const width = 600
  const height = 600
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-inside="booklet" width="1000" height="1000" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${color}"/>
    <g fill="none" stroke="${style.custom ? style.accent : ink}" opacity=".25">${style.custom
      ? `<g transform="translate(${(width - 600) / 2} 0)" stroke-width="3">${packagingPattern(style.id)}</g>`
      : `<circle cx="${width / 2}" cy="285" r="170"/><circle cx="${width / 2}" cy="285" r="130"/>`}<path d="M40 460H${width - 40}"/></g>
    <g fill="${ink}">
      ${text('BOOKLET', 65, 14)}
      ${text(album.title, 510, 32, 'serif')}
      ${text(album.artist, 548, 16)}
      ${text(`${album.year} · ${album.genre}`, 575, 10)}
    </g>
  </svg>`)
}

// 盒底内页大部分被光盘挡住：光盘圆心约在 (387, 295)、半径约 300。
// 因此把图形放大成围绕光盘的边框，文字放在左侧色带和四角露出的区域。
function insideBackArtwork(
  album: ArtworkDetails,
  style: ReturnType<typeof getPackagingStyle>,
  color: string,
  ink: string,
): string {
  const [cx, cy] = [387, 295]
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-inside="back" width="1380" height="1180" viewBox="0 0 690 590">
    <rect width="690" height="590" fill="${color}"/>
    <g fill="none" stroke="${style.accent}" stroke-width="4" opacity=".35" transform="translate(${cx} ${cy}) scale(1.75) translate(-300 -300)">${packagingPattern(style.id)}</g>
    <g fill="none" stroke="${ink}" opacity=".25"><circle cx="${cx}" cy="${cy}" r="312"/><circle cx="${cx}" cy="${cy}" r="328" stroke-dasharray="2 6"/></g>
    <rect width="64" height="590" fill="${style.accent}"/>
    <g fill="${color}" text-anchor="middle" writing-mode="vertical-rl" transform="translate(32 0)">
      ${centeredText(`${album.artist} · ${album.title}`, 295, 15, 500)}
    </g>
    <g fill="${ink}">
      ${text('ORIGINAL RECORDINGS', 52, 11, 'sans-serif', 92, 190)}
      ${text(`℗ & © ${album.year} ${album.artist}`, 548, 10, 'sans-serif', 92, 220)}
      ${text('ALL RIGHTS RESERVED', 566, 8, 'sans-serif', 92, 220)}
    </g>
    <g fill="${ink}" text-anchor="end">
      ${text(`${album.year} · ${album.genre}`, 52, 11, 'sans-serif', 650, 180)}
      ${text('COMPACT DISC · DIGITAL AUDIO', 566, 8, 'sans-serif', 650, 180)}
    </g>
  </svg>`)
}

export function getSpineArtwork(
  album: ArtworkDetails & Pick<Album, 'spineUrl' | 'rightSpineUrl'>,
  side: 'left' | 'right',
): string {
  const uploaded = side === 'left' ? album.spineUrl : album.rightSpineUrl
  if (uploaded) return uploaded
  const width = getSpineDepth(album) * 2
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" data-cd-spine="${side}" width="${width * 3}" height="1800" viewBox="0 0 ${width} 600">
    <rect width="${width}" height="600" fill="${escapeXml(album.color)}"/>
    <g fill="${escapeXml(album.ink)}" text-anchor="middle" writing-mode="vertical-rl" transform="translate(${width / 2} 0)">
      ${centeredText(`${album.artist} · ${album.title}`, 300, 18, 520)}
    </g>
  </svg>`)
}
