export type Locale = "ja" | "en";
export type LocalizedText = Record<Locale, string>;

export const uiCopy = {
  ja: {
    siteTitle: "Jozankei Time Map",
    siteTagline: "時間で巡る温泉街",
    landingEyebrow: "定山渓を、昼と夜のリズムで旅する。",
    landingTitle: "時間で表情が変わる温泉街を、ひとつの地図で。",
    landingLead:
      "昼は散策と開放感、夜は灯りと余韻。Jozankei Time Map は、時間帯ごとのおすすめ体験を切り替えながら、1日の過ごし方を直感的に描けるサイトです。",
    landingPrimaryCta: "地図を見る",
    conceptTitle: "昼と夜で、同じ場所が違って見える。",
    conceptBody:
      "場所そのものではなく、その時間に流れる空気を案内します。温泉街の魅力を、時刻で編成されたストーリーとして体験できます。",
    dayLabel: "昼",
    nightLabel: "夜",
    bothLabel: "昼夜",
    dayMood: "散策・自然・カフェ・フォトスポット",
    nightMood: "灯り・湯けむり・静けさ・余韻",
    sectionsTitle: "使い方",
    steps: [
      "まずは時間帯を選び、その瞬間のおすすめスポットを絞り込む",
      "気になるピンをタップして、下部カードで体験内容を確認する",
      "言語を切り替えながら、現地利用にも事前計画にも使う",
    ],
    mapIntroTitle: "時間で読む、温泉街の1日",
    mapPageTitle: "Map View",
    languageLabel: "言語",
    zoomControlsLabel: "地図の拡大縮小",
    zoomInLabel: "拡大",
    zoomOutLabel: "縮小",
    displayModeLabel: "表示モード",
    singleModeLabel: "単独表示モード",
    compareModeLabel: "比較表示モード",
    magnifierModeLabel: "虫眼鏡表示モード",
    clockModeLabel: "時計表示モード",
    clockDialLabel: "時刻を調整",
    scratchModeLabel: "スクラッチ表示モード",
    compareHandleLabel: "昼夜比較の境界を動かす",
    scratchResetLabel: "スクラッチをリセット",
    timeLabel: "時間帯",
    viewMap: "地図を見る",
    backHome: "トップへ戻る",
    mapDataAttribution: "地図データ: OpenStreetMap contributors / Geofabrik",
    cardEmptyTitle: "ピンを選択",
    cardEmptyHint: "気になるスポットをひとつ選ぶと、ここに体験が表示されます。",
    detailsLabel: "体験メモ",
    routeHint: "この時間に表示中",
    categoryLabel: "カテゴリ",
    exploreLabel: "Explore",
  },
  en: {
    siteTitle: "Jozankei Time Map",
    siteTagline: "Travel the hot spring town by time",
    landingEyebrow: "Experience Jozankei through the rhythm of day and night.",
    landingTitle: "One map for a hot spring town that changes with time.",
    landingLead:
      "Day invites walking and openness. Night brings light and afterglow. Jozankei Time Map helps visitors imagine a full day by switching recommended experiences by time.",
    landingPrimaryCta: "Open the time map",
    conceptTitle: "The same town, seen differently by hour.",
    conceptBody:
      "This site does not guide by place alone. It guides by atmosphere. The hot spring town becomes a story arranged by time of day.",
    dayLabel: "Day",
    nightLabel: "Night",
    bothLabel: "Both",
    dayMood: "walks, nature, cafes, photo spots",
    nightMood: "lights, steam, stillness, afterglow",
    sectionsTitle: "How it works",
    steps: [
      "Choose a time mode first to focus on spots that fit that moment",
      "Tap a pin to read the experience in the bottom detail card",
      "Switch language at any point for local use or trip planning",
    ],
    mapIntroTitle: "A one-day story of the town",
    mapPageTitle: "Map View",
    languageLabel: "Language",
    zoomControlsLabel: "Map zoom controls",
    zoomInLabel: "Zoom in",
    zoomOutLabel: "Zoom out",
    displayModeLabel: "Display mode",
    singleModeLabel: "Single view mode",
    compareModeLabel: "Compare view mode",
    magnifierModeLabel: "Magnifier view mode",
    clockModeLabel: "Clock view mode",
    clockDialLabel: "Adjust time",
    scratchModeLabel: "Scratch view mode",
    compareHandleLabel: "Adjust the day-night comparison divider",
    scratchResetLabel: "Reset scratch reveal",
    timeLabel: "Time",
    viewMap: "View map",
    backHome: "Back to home",
    mapDataAttribution: "Map data: OpenStreetMap contributors / Geofabrik",
    cardEmptyTitle: "Select a pin",
    cardEmptyHint: "Choose any visible spot to reveal its matching experience here.",
    detailsLabel: "Experience note",
    routeHint: "Visible in this time mode",
    categoryLabel: "Category",
    exploreLabel: "Explore",
  },
} as const;

export const themeByMode = {
  day: {
    className: "theme-day",
    glow: "rgba(255, 191, 102, 0.24)",
  },
  night: {
    className: "theme-night",
    glow: "rgba(93, 168, 255, 0.18)",
  },
  compare: {
    className: "theme-compare",
    glow: "rgba(162, 185, 212, 0.2)",
  },
  scratch: {
    className: "theme-scratch",
    glow: "rgba(129, 176, 237, 0.16)",
  },
} as const;

export type UiCopy = typeof uiCopy;
export type UiText = UiCopy[Locale];
export type ThemeByMode = typeof themeByMode;
