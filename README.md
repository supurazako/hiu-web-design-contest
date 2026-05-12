# hiu-web-design-contest

Jozankei Time Map - 時間で巡る温泉街

## 必要なもの

- Node.js
- npm

## セットアップ

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

起動後、ブラウザで以下を開きます。

- ランディングページ: `http://localhost:4321/`
- 全画面地図ビュー: `http://localhost:4321/#map`

Astro が別ポートで起動した場合は、ターミナルに表示された URL を使ってください。

## よく使うコマンド

```bash
npm run dev
```

開発サーバーを起動します。

```bash
npm run build
```

`astro check` を実行してから静的サイトをビルドします。

```bash
npm run preview
```

ビルド済みのサイトをローカルで確認します。

```bash
npm run check
```

Astro / TypeScript のチェックを実行します。

```bash
npm run lint
```

ESLint を実行します。

```bash
npm run format:check
```

Prettier の整形チェックを実行します。

```bash
npm run format
```

Prettier でファイルを整形します。

## ルート

- `/` ランディングページ
- `/#map` 全画面地図ビュー

## 主なディレクトリ

- `src/pages/index.astro`: 入口ページ
- `src/components`: Astro / React コンポーネント
- `src/scripts`: 地図とインタラクション処理
- `src/data`: スポット、UI 文言、日記データ整形
- `src/styles`: CSS
- `public/geodata/map.geojson`: 地図表示用 GeoJSON
- `public/spots`: スポット画像
- `public/features`: 機能紹介用画像
