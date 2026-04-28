#!/usr/bin/env bash
set -euo pipefail

SOURCE_TIF="${1:-VNL_npp_2025_global_vcmslcfg_v2_c202604011200.average_masked.dat.tif}"
CACHE_DIR=".cache/night-lights"
OUTPUT_DIR="public/tiles/night-lights"
COLOR_RELIEF="scripts/night-lights-color-relief.txt"

if [ ! -f "$SOURCE_TIF" ]; then
  echo "Source GeoTIFF not found: $SOURCE_TIF" >&2
  exit 1
fi

mkdir -p "$CACHE_DIR"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

gdal_translate \
  -projwin 140.990503 43.100698 141.357103 42.893114 \
  -projwin_srs EPSG:4326 \
  "$SOURCE_TIF" \
  "$CACHE_DIR/jozankei-night-lights-subset.tif"

gdalwarp \
  -overwrite \
  -t_srs EPSG:3857 \
  -r cubic \
  -tr 30 30 \
  "$CACHE_DIR/jozankei-night-lights-subset.tif" \
  "$CACHE_DIR/jozankei-night-lights-smooth-3857.tif"

gdaldem color-relief \
  -alpha \
  "$CACHE_DIR/jozankei-night-lights-smooth-3857.tif" \
  "$COLOR_RELIEF" \
  "$CACHE_DIR/jozankei-night-lights-rgba.tif"

gdal2tiles.py \
  --xyz \
  --profile=mercator \
  --resampling=bilinear \
  --zoom=10-15 \
  --webviewer=none \
  --processes=4 \
  "$CACHE_DIR/jozankei-night-lights-rgba.tif" \
  "$OUTPUT_DIR"
