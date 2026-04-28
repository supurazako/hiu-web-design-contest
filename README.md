# hiu-web-design-contest

Jozankei Time Map - 時間で巡る温泉街

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Night Light Tiles

Put the VNL_npp GeoTIFF at the repository root, then generate the static tiles:

```bash
npm run tiles:night-lights
```

The generated XYZ tiles are written to `public/tiles/night-lights/`.
The script smooths the source raster with cubic resampling before colorizing it.

## Routes

- `/` ランディングページ
- `/map` 地図ページ
