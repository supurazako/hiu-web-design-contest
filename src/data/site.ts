export type Locale = "ja" | "en";
export type TimeMode = "day" | "night" | "both";

export type LocalizedText = Record<Locale, string>;

export type Spot = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: LocalizedText;
  timeMode: TimeMode;
  coordinates: [number, number];
    image: {
        alt: LocalizedText;
        placeholderVariant: "river" | "steam" | "forest" | "light";
    };
    accent: string;
};

export const uiCopy = {
    ja: {
        siteTitle: "Jozankei Time Map",
        siteTagline: "時間で巡る温泉街",
        landingEyebrow: "定山渓を、昼と夜のリズムで旅する。",
        landingTitle: "時間で表情が変わる温泉街を、ひとつの地図で。",
        landingLead:
            "昼は散策と開放感、夜は灯りと余韻。Jozankei Time Map は、時間帯ごとのおすすめ体験を切り替えながら、1日の過ごし方を直感的に描けるサイトです。",
        landingPrimaryCta: "地図を見る",
        landingSecondaryCta: "体験の違いを知る",
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
        mapIntroBody:
            "抽象化した地図の上で、川沿いの散策、夕暮れの灯り、湯けむりの滞留をなぞりながら、定山渓らしい時間の流れを表現しています。",
        footerNote:
            "写真は後から差し替え可能なプレースホルダー構成です。初版では体験設計と情報構造を優先しています。",
        mapPageTitle: "Map View",
	    mapPageLead:
	      "時間帯ごとに切り替わる雰囲気を見比べながら、定山渓の流れを地図上で眺めるためのビューです。",
        mapOverlayTitle: "Jozankei",
	    mapOverlayBody: "地図をドラッグしながら温泉街を巡り、時間帯ごとの雰囲気の違いを眺める。",
    languageLabel: "言語",
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
	    cardEmptyBody:
	      "地図上のスポットをタップすると、その時間帯に合う体験が下部カードに表示されます。",
        detailsLabel: "体験メモ",
        routeHint: "この時間に表示中",
        legendRiver: "渓流ライン",
        legendSteam: "湯けむりエリア",
        legendLight: "灯りの集積",
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
        landingSecondaryCta: "See the contrast",
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
        mapIntroBody:
            "The map is intentionally abstract. River flow, steam zones, and clusters of light work together to express how Jozankei feels across a day.",
        footerNote:
            "Images are placeholders designed for later replacement. The first release prioritizes narrative and structure.",
        mapPageTitle: "Map View",
	    mapPageLead:
	      "A map view for comparing how Jozankei changes across the day. The background is an abstract map rather than a navigation map.",
        mapOverlayTitle: "Jozankei",
	    mapOverlayBody: "Drag the map through the town and explore how its atmosphere changes by time of day.",
    languageLabel: "Language",
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
	    cardEmptyBody:
	      "Tap any visible spot on the map to open the matching experience card below.",
        detailsLabel: "Experience note",
        routeHint: "Visible in this time mode",
        legendRiver: "River line",
        legendSteam: "Steam zone",
        legendLight: "Light cluster",
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

export const spots: Spot[] = [
    {
        id: "river-terrace",
        name: {
            ja: "川の音が聞こえるテラス",
            en: "Terrace with the River Sound",
        },
        description: {
            ja: "昼の光を受けた渓流を眺めながら、風と水音で深呼吸できる休憩スポット。",
            en: "A restful terrace where daylight, breeze, and river sound create an open pause.",
        },
        category: { ja: "自然", en: "Nature" },
        timeMode: "day",
        coordinates: [42.952045, 141.1517204],
        image: {
            alt: {
                ja: "渓流沿いのテラスを表現したプレースホルダー",
                en: "Placeholder artwork for a riverside terrace",
            },
            placeholderVariant: "river",
        },
        accent: "#f59e0b",
    },
    {
        id: "mist-footbath",
        name: {
            ja: "湯けむりに包まれる足湯",
            en: "Footbath in Rising Steam",
        },
        description: {
            ja: "橋の近くにある足湯。立ち上る湯けむりが昼は軽やかに、夜は静かに輪郭を変える。",
            en: "A footbath near the bridge where steam shifts from airy by day to quiet by night.",
        },
        category: { ja: "共通", en: "Shared" },
        timeMode: "both",
        coordinates: [42.9652119, 141.1651837],
        image: {
            alt: {
                ja: "湯けむりの足湯を表現したプレースホルダー",
                en: "Placeholder artwork for a steamy footbath",
            },
            placeholderVariant: "steam",
        },
        accent: "#f97316",
    },
    {
        id: "forest-cafe",
        name: {
            ja: "森の余白カフェ",
            en: "Forest Margin Cafe",
        },
        description: {
            ja: "散策の途中に立ち寄る、小さな森際のカフェ。窓辺から柔らかい緑が差し込む。",
            en: "A small cafe at the forest edge, ideal for a quiet stop during a daytime walk.",
        },
        category: { ja: "カフェ", en: "Cafe" },
        timeMode: "day",
        coordinates: [42.966489, 141.169688],
        image: {
            alt: {
                ja: "森際のカフェを表現したプレースホルダー",
                en: "Placeholder artwork for a forest-side cafe",
            },
            placeholderVariant: "forest",
        },
        accent: "#22c55e",
    },
    {
        id: "lantern-street",
        name: {
            ja: "灯りがにじむ路地",
            en: "Lantern Alley After Dusk",
        },
        description: {
            ja: "夜になると、窓明かりと行灯の反射が静かな道に広がる。歩幅をゆるめたくなる小路。",
            en: "At night, lantern glow and window light soften a quiet lane made for slow walking.",
        },
        category: { ja: "ライトアップ", en: "Light-up" },
        timeMode: "night",
        coordinates: [42.9654265, 141.1619854],
        image: {
            alt: {
                ja: "灯りがにじむ路地を表現したプレースホルダー",
                en: "Placeholder artwork for a lantern-lit alley",
            },
            placeholderVariant: "light",
        },
        accent: "#fb7185",
    },
    {
        id: "moon-bridge",
        name: {
            ja: "月待ちの橋",
            en: "Bridge for Waiting Moonlight",
        },
        description: {
            ja: "川面に映る灯りを眺める夜のフォトスポット。立ち止まることで景色が完成する。",
            en: "A night photo spot where reflected light on the river rewards anyone who pauses.",
        },
        category: { ja: "フォトスポット", en: "Photo spot" },
        timeMode: "night",
        coordinates: [42.9707756, 141.1780424],
        image: {
            alt: {
                ja: "夜の橋を表現したプレースホルダー",
                en: "Placeholder artwork for a bridge at night",
            },
            placeholderVariant: "light",
        },
        accent: "#38bdf8",
    },
    {
        id: "steam-garden",
        name: {
            ja: "湯気の庭",
            en: "Garden of Steam",
        },
        description: {
            ja: "湯けむり越しに植栽と石畳が見える小さな広場。昼は軽い散策、夜は余韻の休憩向け。",
            en: "A compact square of steam, stone, and planting suited to both a daytime detour and a calm night break.",
        },
        category: { ja: "昼夜で意味が変わる場所", en: "Changes with time" },
        timeMode: "both",
        coordinates: [42.9654832, 141.1662765],
        image: {
            alt: {
                ja: "湯気の庭を表現したプレースホルダー",
                en: "Placeholder artwork for a steam garden",
            },
            placeholderVariant: "steam",
        },
        accent: "#a855f7",
    },
    {
        id: "sunrise-slope",
        name: {
            ja: "朝光の坂道",
            en: "Slope of Early Light",
        },
        description: {
            ja: "坂を上がるにつれて温泉街を見下ろせる、昼の導入に向いた見晴らしポイント。",
            en: "A scenic slope that opens up the town view and works well as a start to the daytime route.",
        },
        category: { ja: "散策", en: "Walk" },
        timeMode: "day",
        coordinates: [42.9667041, 141.1524599],
        image: {
            alt: {
                ja: "朝光の坂道を表現したプレースホルダー",
                en: "Placeholder artwork for a hillside viewpoint",
            },
            placeholderVariant: "forest",
        },
        accent: "#84cc16",
    },
    {
        id: "quiet-lounge",
        name: {
            ja: "余韻のラウンジ",
            en: "Afterglow Lounge",
        },
        description: {
            ja: "温泉後に座って過ごすための、音を抑えた夜の休憩空間。照度は低く、会話は小さく。",
            en: "A low-lit lounge for winding down after the bath, shaped for low voices and stillness.",
        },
        category: { ja: "夜の休憩", en: "Night rest" },
        timeMode: "night",
        coordinates: [42.9678956, 141.1687088],
        image: {
            alt: {
                ja: "夜のラウンジを表現したプレースホルダー",
                en: "Placeholder artwork for a quiet night lounge",
            },
            placeholderVariant: "light",
        },
        accent: "#60a5fa",
    },
    {
        id: "river-step",
        name: {
            ja: "川辺の段々ベンチ",
            en: "Riverside Step Bench",
        },
        description: {
            ja: "昼は腰掛けて景色を切り取り、夜は川音だけを聞く。時間で役割が変わるベンチエリア。",
            en: "A bench area that frames scenery by day and reduces the town to river sound by night.",
        },
        category: { ja: "共通", en: "Shared" },
        timeMode: "both",
        coordinates: [42.9690384, 141.1698124],
        image: {
            alt: {
                ja: "川辺のベンチを表現したプレースホルダー",
                en: "Placeholder artwork for riverside seating",
            },
            placeholderVariant: "river",
        },
        accent: "#06b6d4",
    },
];
