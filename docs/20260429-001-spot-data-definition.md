# ADR: スポットデータ定義

## ステータス

Accepted

## 背景

Jozankei Time Map では、コンテスト応募時点で 50-60 件程度のスポットを扱う想定である。スポット内容の編集元は Google Spreadsheet とし、アプリケーションは静的サイトとして構築するため、応募時点ではデータベースや CMS は導入しない。

スポットデータでは、以下を扱う必要がある。

- 日本語 / 英語の表示文言
- 地図上のピンと詳細カード
- カテゴリ分類とカテゴリ表示名
- 昼 / 夜 / 両方の表示時間帯
- ゲーム的な収集要素としての任意の日記

日記はすべてのスポットに付与するものではなく、最大 10 件程度を想定する。日記は独立したクエストや章ではなく、特定スポットに紐づく補助的な収集要素として扱う。

## 決定

スポットデータは Google Spreadsheet で編集し、アプリケーション側では JSON として取り込む。

アプリケーション側のスポットデータは `src/data/spots.json` に保持する。TypeScript 側では、データ形、カテゴリ ID、カテゴリ表示名、UI で利用するための検証や変換を定義する。

カテゴリは、スポットごとに日本語 / 英語の表示文字列を直接持たせず、安定した ID として保持する。初期カテゴリ ID は以下とする。

- `food`
- `stay`
- `onsen`
- `sightseeing`

日記データは、各スポットの任意フィールド `diary` として保持する。日記がないスポットでは `diary` を省略する。初期版では、日記にレア度、ランク、季節限定などの分類は持たせない。

## データ形

アプリケーションは、取り込んだスポットデータを以下の形として扱う。

```ts
type Locale = "ja" | "en";
type LocalizedText = Record<Locale, string>;
type TimeMode = "day" | "night" | "both";
type SpotCategoryId = "food" | "stay" | "onsen" | "sightseeing";

type SpotDiary = {
  title: LocalizedText;
  body: LocalizedText;
  unlockHint?: LocalizedText;
};

type Spot = {
  id: string;
  categoryId: SpotCategoryId;
  timeMode: TimeMode;
  coordinates: [number, number];
  name: LocalizedText;
  description: LocalizedText;
  image: {
    src: string;
    alt: LocalizedText;
  };
  accent: string;
  published: boolean;
  diary?: SpotDiary;
};
```

カテゴリ表示名は TypeScript 側に集約する。

```ts
export const spotCategories = {
  food: { label: { ja: "食べ物", en: "Food" } },
  stay: { label: { ja: "宿", en: "Stay" } },
  onsen: { label: { ja: "温泉・足湯", en: "Onsen / Footbath" } },
  sightseeing: { label: { ja: "観光スポット", en: "Sightseeing" } },
} as const;
```

JSON への変換時には、`lat` と `lng` を `coordinates` にまとめる。`name_*`、`description_*`、`image_alt_*`、`diary_*` の多言語列は `LocalizedText` の形にまとめる。日記タイトルと本文が空の場合は `diary` を出力しない。

## JSON 例

```json
{
  "id": "mist-footbath",
  "categoryId": "onsen",
  "timeMode": "both",
  "coordinates": [42.9652119, 141.1651837],
  "name": {
    "ja": "湯けむりに包まれる足湯",
    "en": "Footbath in Rising Steam"
  },
  "description": {
    "ja": "橋の近くにある足湯。立ち上る湯けむりが昼は軽やかに、夜は静かに輪郭を変える。",
    "en": "A footbath near the bridge where steam shifts from airy by day to quiet by night."
  },
  "image": {
    "src": "/spots/mist-footbath.jpg",
    "alt": {
      "ja": "湯けむりの足湯",
      "en": "Steamy footbath"
    }
  },
  "accent": "#f97316",
  "published": true,
  "diary": {
    "title": {
      "ja": "湯けむりの向こう",
      "en": "Beyond the Steam"
    },
    "body": {
      "ja": "橋を渡る前に、足だけ湯に沈めた。川の音が少し遠くなった。",
      "en": "Before crossing the bridge, I dipped my feet into the bath. The river sounded a little farther away."
    },
    "unlockHint": {
      "ja": "橋の近くの湯けむりを探す",
      "en": "Look for steam near the bridge"
    }
  }
}
```

## 検証方針

変換または取り込み時には、少なくとも以下を検証する。

- `id` が空ではなく、一意であること。
- `categoryId` が対応カテゴリ ID のいずれかであること。
- `timeMode` が `day`、`night`、`both` のいずれかであること。
- `coordinates` が有効な緯度・経度の数値であること。
- 必須の多言語フィールドに `ja` と `en` が揃っていること。
- `published` が boolean であること。
- 日記タイトルと本文が揃っていない場合は `diary` を出力しないこと。

## 前提

コンテスト応募版では、データベース、CMS、リモート実行時コンテンツ API は導入しない。

Google Spreadsheet から JSON への同期は、初期段階では手動 export で十分とする。応募版で完全自動化は必須としない。

日記はスポットに紐づく収集要素である。複数スポットをまたぐ章立て、独立クエスト、レア度、ランキング、季節限定の日記分類は初期スコープ外とする。
