import type { TranslationKey } from '../i18n'

interface GenreOption {
  key: string
  labelKey?: TranslationKey
}

const DEFAULT_GENRES: GenreOption[] = [
  { key: 'Indie Folk', labelKey: 'genres.indieFolk' },
  { key: 'Alternative', labelKey: 'genres.alternative' },
  { key: 'Ambient', labelKey: 'genres.ambient' },
  { key: 'Jazz', labelKey: 'genres.jazz' },
  { key: 'Pop', labelKey: 'genres.pop' },
  { key: 'Rock', labelKey: 'genres.rock' },
  { key: 'Hip-Hop', labelKey: 'genres.hipHop' },
  { key: 'R&B', labelKey: 'genres.rnb' },
  { key: 'Electronic', labelKey: 'genres.electronic' },
  { key: 'Dance', labelKey: 'genres.dance' },
  { key: 'Classical', labelKey: 'genres.classical' },
  { key: 'Folk', labelKey: 'genres.folk' },
  { key: 'Country', labelKey: 'genres.country' },
  { key: 'Blues', labelKey: 'genres.blues' },
  { key: 'Soul', labelKey: 'genres.soul' },
  { key: 'Funk', labelKey: 'genres.funk' },
  { key: 'Reggae', labelKey: 'genres.reggae' },
  { key: 'Metal', labelKey: 'genres.metal' },
  { key: 'Punk', labelKey: 'genres.punk' },
  { key: 'Disco', labelKey: 'genres.disco' },
  { key: 'Gospel', labelKey: 'genres.gospel' },
  { key: 'Latin', labelKey: 'genres.latin' },
  { key: 'World', labelKey: 'genres.world' },
  { key: 'Soundtrack', labelKey: 'genres.soundtrack' },
  { key: 'Other', labelKey: 'genres.other' },
]

export function getGenreOptions(genres: string[]): GenreOption[] {
  const defaults = new Set(DEFAULT_GENRES.map((genre) => genre.key))
  return [
    ...DEFAULT_GENRES,
    ...[...new Set(genres)].filter((genre) => !defaults.has(genre)).map((key) => ({ key })),
  ]
}
