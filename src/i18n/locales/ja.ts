import type { en } from './en'

export const ja: Record<keyof typeof en, string> = {
  // Meta
  'meta.title': 'CDキャビネット — 音楽のための居場所',
  'meta.description':
    'フィジカルな音楽のための静かな居場所。バーチャルCDコレクションを眺め、開き、整理する。',

  // Header
  'header.brand': 'cd cabinet',
  'header.note': '音楽のための居場所',
  'header.est': `EST. ${__BUILD_YEAR__}`,

  // Hero / Heading
  'hero.eyebrow': 'プライベート・アーカイブ',
  'hero.titleLine1': '手元に置く、',
  'hero.titleLine2': '心満たす音楽。',
  'hero.subtitleLine1': '音、物語、そして懐かしい名盤たち。',
  'hero.subtitleLine2': '一枚手に取って、ゆっくりお過ごしください。',
  'hero.countLabel': '棚に並ぶアルバム',
  'hero.countQuote': 'すべての盤に、それぞれの物語。',

  // Genres
  'genres.all': 'すべてのアルバム',
  'genres.indieFolk': 'インディー・フォーク',
  'genres.alternative': 'オルタナティヴ',
  'genres.ambient': 'アンビエント',
  'genres.jazz': 'ジャズ',
  'genres.other': 'その他',

  // Toolbar
  'toolbar.filterByGenre': 'ジャンルで絞り込み',
  'toolbar.searchPlaceholder': 'アルバムを検索',
  'toolbar.searchAria': 'アルバムやアーティストを検索',
  'toolbar.sortLabel': '並び替え',
  'toolbar.sortAria': 'アルバムの並び替え',
  'toolbar.sortShelf': '棚の並び順',
  'toolbar.sortArtist': 'アーティスト名（A–Z）',
  'toolbar.sortYear': 'リリース年（新しい順）',
  'toolbar.editShelf': '棚を整理',
  'toolbar.doneArranging': '整理を完了',
  'toolbar.addRecording': '＋ アルバムを追加',

  // Shelf Caption & States
  'shelf.arrangingTitle': 'コレクションの並び替え中',
  'shelf.collectionTitle': 'あなたのコレクション',
  'shelf.arrangingHelp':
    'ドラッグで並び替え · スペースキーと矢印キーでも操作可能',
  'shelf.viewingHelp': 'カーソルを合わせて探索 · クリックして開く',
  'shelf.loading': 'コレクションを読み込み中…',
  'shelf.belowSummary': 'スクロールの手を休めて、音楽に耳を傾ける。',
  'shelf.recordingsCount': '全 {total} 作中 {shown} 作を表示',
  'shelf.shelvesCount': '{count} 段',
  'shelf.reorderAria': '{artist}「{title}」の並び順を変更',
  'shelf.openAria': '{artist}「{title}」を開く',

  // Storage
  'storage.saving': 'コレクションを保存中…',
  'storage.saved': 'このブラウザに保存済み。',
  'storage.retry': '再試行',
  'storage.saveFailed':
    'このブラウザに保存できませんでした。空き容量を確保して再試行してください。',
  'storage.loadFailed':
    '保存されたコレクションを読み込めませんでした。ブラウザストレージが利用できない可能性があります。',
  'storage.loadBeforeEdit':
    '変更を加える前に、保存されたコレクションを読み込んでください。',

  // Footer
  'footer.tagline': 'フィジカルな音楽への愛を込めて。',
  'footer.corner': 'あなたの音楽、世界でたったひとつの居場所。',

  // Viewer / Active CD
  'viewer.dialogAria': '{artist}「{title}」',
  'viewer.closerLook': '詳しく見る',
  'viewer.editRecording': 'アルバムを編集',
  'viewer.close': '閉じる',
  'viewer.closeAlbumAria': 'アルバムを閉じる',
  'viewer.fromCollection': 'コレクションより',
  'viewer.singleDisc': 'コンパクトディスク',
  'viewer.multipleDiscs': '{count}枚組 CD',
  'viewer.chooseDiscAria': 'ディスクを選択',
  'viewer.discButton': 'ディスク {number}',
  'viewer.viewCaseAria': 'ケースを見る',
  'viewer.viewFront': 'フロント',
  'viewer.viewInside': 'ケース内',
  'viewer.viewBack': 'バック',
  'viewer.obiStripHeading': '帯（オビ）',
  'viewer.obiStripAria': '帯（オビ）',
  'viewer.obiAttached': '装着',
  'viewer.obiHidden': '非表示',
  'viewer.obiFlat': '広げる',
  'viewer.emptyTracks': 'このディスクのトラック情報はまだありません。',
  'viewer.coverArtworkAlt': '{title}のフロントジャケット',
  'viewer.backCoverArtworkAlt': '{title}のバックインレイ',
  'viewer.obiStripAlt': '{title}の帯',

  // Editor
  'editor.eyebrow': 'コレクションに加える',
  'editor.addTitle': 'アルバムを追加',
  'editor.editTitle': 'アルバムを編集',
  'editor.closeAria': 'アルバムエディタを閉じる',
  'editor.coverArtwork': 'フロントジャケット',
  'editor.chooseCover': 'ジャケットを選択',
  'editor.uploadCoverAria': 'フロントジャケットをアップロード',
  'editor.coverPreviewAlt': 'ジャケットのプレビュー',
  'editor.chooseImage': '画像を選択',
  'editor.spineArtwork': '背表紙アートワーク',
  'editor.optional': '任意',
  'editor.spinePlaceholder': 'アーティスト · アルバム名',
  'editor.uploadSpineAria': '背表紙アートワークをアップロード',
  'editor.spinePreviewAlt': '背表紙のプレビュー',
  'editor.useGeneratedSpine': '自動生成の背表紙を使用',
  'editor.spineGuidance':
    '縦長のアートワーク画像を使用してください。未指定の場合はアルバム情報から自動生成します。',
  'editor.backCoverArtwork': 'バックインレイ',
  'editor.chooseBackCover': 'バックインレイを選択',
  'editor.uploadBackCoverAria': 'バックインレイをアップロード',
  'editor.backCoverPreviewAlt': 'バックインレイのプレビュー',
  'editor.useGeneratedBackCover': '自動生成のバックインレイを使用',
  'editor.obiPaperStrip': '帯（オビ）',
  'editor.chooseObi': '帯の画像を選択',
  'editor.uploadObiAria': '帯（オビ）をアップロード',
  'editor.obiPreviewAlt': '帯のプレビュー',
  'editor.useGeneratedObi': '自動生成の帯を使用',
  'editor.obiUploadGuidance':
    '裏表紙、背、表表紙の順に左から右へ展開した帯の画像をアップロードしてください。',
  'editor.uploadGuidance': 'JPG、PNG、WebP · 1ファイルにつき最大 5 MB',
  'editor.albumTitle': 'アルバム名',
  'editor.artist': 'アーティスト',
  'editor.year': 'リリース年',
  'editor.genre': 'ジャンル',
  'editor.numberOfDiscs': 'ディスク枚数',
  'editor.discSingle': '枚組',
  'editor.discPlural': '枚組',
  'editor.readingArtwork': 'アートワークを読み込み中…',
  'editor.savedNotice': 'このブラウザに保存済み。',
  'editor.cancel': 'キャンセル',
  'editor.saving': '保存中…',
  'editor.saveChanges': '変更を保存',
  'editor.addRecording': 'アルバムを追加',
  'editor.errorMissingCover':
    'アルバムを追加するにはジャケット画像をアップロードしてください。',
  'editor.errorMissingFields':
    'アルバム名とアーティスト名を入力してください。',
  'editor.errorSaveFailed':
    '保存できませんでした。ブラウザのストレージ容量を確認して再試行してください。',

  // Artwork Errors
  'artworkErrors.invalidType':
    'JPG、PNG、またはWebP画像を選択してください。',
  'artworkErrors.tooLarge': '5MB以下の画像を選択してください。',
  'artworkErrors.readFailed':
    '画像を読み込めませんでした。もう一度お試しください。',
  'artworkErrors.interrupted': '画像の読み込みが中断されました。',
  'artworkErrors.decodeFailed':
    'このファイルを画像として開くことができませんでした。',

  'player.label': 'CDプレーヤー',
  'player.play': '再生',
  'player.pause': '一時停止',
  'player.stop': '停止',
  'player.previous': '前の曲',
  'player.next': '次の曲',
  'player.eject': 'CDをケースに戻す',
  'player.seek': '再生位置',
  'player.volume': '音量',
  'player.loading': '読み込み中',
  'player.playing': '再生中',
  'player.ready': '準備完了',
  'player.noAudio': 'アルバム編集で音声を追加してください。',
  'player.missingTrack': 'この曲には音声がありません。アルバム編集で追加してください。',
  'player.playFailed': '再生できませんでした。再生ボタンを押すか、対応する音声を追加してください。',
  'player.playDisc': 'ディスク {number} を最初から再生',
  'player.playTrack': '「{title}」を再生',
  'editor.audioHeading': '音楽と曲目',
  'editor.audioFile': '音声',
  'editor.removeTrackAction': '曲を削除',
  'editor.errorMissingTrackTitle': 'すべての曲にタイトルを入力してください。',
  'editor.audioGuidance': '1曲につき1ファイル · MP3、M4A、WAV、OGG、FLAC、AAC、WebM · 各100MBまで。このブラウザに保存されます。',
  'editor.uploadAudio': '音声ファイルを追加',
  'editor.replaceAudio': '「{title}」の音声をアップロード',
  'editor.trackTitle': '曲 {number} のタイトル',
  'editor.removeTrack': '「{title}」を削除',
  'editor.removeAudio': '「{title}」の音声を削除',
  'editor.noAudio': '音声なし',
  'editor.readingAudio': '音声を確認中…',
  'audioErrors.invalidType': 'MP3、M4A、WAV、OGG、FLAC、AAC、WebMの音声を選択してください。',
  'audioErrors.tooLarge': '100MB以下の音声ファイルを選択してください。',
  'audioErrors.decodeFailed': '音声が空、破損、またはこのブラウザでは非対応です。',

  // Language Selector
  'language.selectAria': '言語を選択',
  'language.en': 'English',
  'language.zh': '中文',
  'language.ja': '日本語',
}
