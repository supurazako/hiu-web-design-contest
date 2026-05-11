import rawSpots from "./spots.json";
import type { LocalizedText } from "./site";

export type TimeMode = "day" | "night" | "both";
export type SpotCategoryId = "food" | "stay" | "onsen" | "sightseeing";
export type PlaceholderVariant = "river" | "steam" | "forest" | "light";
export type MarkerIcon = {
  color: string;
  iconPath: string;
  iconViewBox: string;
};

export type SpotDiary = {
  title: LocalizedText;
  body: LocalizedText;
  unlockHint?: LocalizedText;
};

export type SpotImageSource = "Pexels" | "Unsplash" | "Pixabay";

export type RawSpot = {
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
  image_url: string;
  image_alt: LocalizedText;
  image_source: SpotImageSource;
  image_license: string;
  image_credit: string;
  image_source_url: string;
  accent: string;
  published: boolean;
  diary?: SpotDiary;
};

export type Spot = RawSpot & {
  category: LocalizedText;
  image: RawSpot["image"] & {
    placeholderVariant: PlaceholderVariant;
  };
  marker: MarkerIcon;
};

export const spotCategories = {
  food: {
    label: { ja: "食べ物", en: "Food" },
    marker: {
      color: "#ef4444",
      iconPath:
        "M240-80v-366q-54-14-87-57t-33-97v-280h80v240h40v-240h80v240h40v-240h80v280q0 54-33 97t-87 57v366h-80Zm400 0v-381q-54-18-87-75.5T520-667q0-89 47-151t113-62q66 0 113 62.5T840-666q0 73-33 130t-87 75v381h-80Z",
      iconViewBox: "0 -960 960 960",
    },
  },
  stay: {
    label: { ja: "宿", en: "Stay" },
    marker: {
      color: "#6366f1",
      iconPath:
        "M40-200v-600h80v400h320v-320h320q66 0 113 47t47 113v360h-80v-120H120v120H40Zm155-275q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm325 75h320v-160q0-33-23.5-56.5T760-640H520v240ZM308.5-531.5Q320-543 320-560t-11.5-28.5Q297-600 280-600t-28.5 11.5Q240-577 240-560t11.5 28.5Q263-520 280-520t28.5-11.5ZM280-560Zm240-80v240-240Z",
      iconViewBox: "0 -960 960 960",
    },
  },
  onsen: {
    label: { ja: "温泉・足湯", en: "Onsen / Footbath" },
    marker: {
      color: "#f97316",
      iconPath:
        "M270-440q5-15 7.5-28.5T280-498q0-30-15-52t-34-47q-19-25-34-55.5T182-731q0-15 1.5-32t5.5-37h81q-5 23-6.5 38t-1.5 28q0 37 15.5 61.5T311-624q18 24 33.5 53t15.5 75q0 14-2 28t-6 28h-82Zm160 0q5-15 7.5-28.5T440-498q0-30-15-52t-34-47q-19-25-34-55.5T342-731q0-15 1.5-32t5.5-37h81q-5 23-7 38t-2 28q0 37 15.5 61.5T470-624q18 24 33.5 53t15.5 75q0 14-1.5 28t-5.5 28h-82Zm160 0q5-15 7.5-28.5T600-498q0-30-15-52t-34-47q-19-25-34-55.5T502-731q0-15 1.5-32t5.5-37h81q-5 23-7 38t-2 28q0 37 15.5 61.5T630-624q18 24 33.5 53t15.5 75q0 14-1.5 28t-5.5 28h-82ZM480-160q-149 0-254.5-58.5T120-360q0-43 31-81.5t89-67.5v93q-20 14-30 28.5T200-360q0 45 87 82.5T480-240q106 0 193-37.5t87-82.5q0-13-10-27.5T720-416v-93q58 29 89 67.5t31 81.5q0 83-105 141.5T480-160Z",
      iconViewBox: "0 -960 960 960",
    },
  },
  sightseeing: {
    label: { ja: "観光スポット", en: "Sightseeing" },
    marker: {
      color: "#22c55e",
      iconPath:
        "M852-212 732-332l56-56 120 120-56 56ZM708-692l-56-56 120-120 56 56-120 120Zm-456 0L132-812l56-56 120 120-56 56ZM108-212l-56-56 120-120 56 56-120 120Zm246-75 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-361Z",
      iconViewBox: "0 -960 960 960",
    },
  },
} as const satisfies Record<
  SpotCategoryId,
  { label: LocalizedText; marker: MarkerIcon }
>;

const placeholderVariantByCategory = {
  food: "forest",
  stay: "light",
  onsen: "steam",
  sightseeing: "river",
} as const satisfies Record<SpotCategoryId, PlaceholderVariant>;

export const spots: Spot[] = (rawSpots as RawSpot[])
  .filter((spot) => spot.published)
  .map((spot) => ({
    ...spot,
    category: spotCategories[spot.categoryId].label,
    marker: spotCategories[spot.categoryId].marker,
    image: {
      ...spot.image,
      placeholderVariant: placeholderVariantByCategory[spot.categoryId],
    },
  }));
