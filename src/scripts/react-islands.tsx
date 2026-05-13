import { createRoot } from "react-dom/client";

import FeatureSpotCarousel from "../components/FeatureSpotCarousel";
import DiaryNotebook from "../components/DiaryNotebook";
import type { DiaryNotebookEntry, DiaryNotebookUiCopy } from "../data/diary";
import type { Locale, UiCopy } from "../data/site";
import { getJsonData } from "./dom-utils";

type FeatureCardsByLocale = Record<Locale, UiCopy[Locale]["featureCards"]>;

const initialLocale: Locale = "ja";

const renderReactIslands = () => {
  const featureCardsByLocale =
    getJsonData<FeatureCardsByLocale>("feature-cards-data");
  const diaryEntries = getJsonData<DiaryNotebookEntry[]>("diary-entries-data");
  const diaryNotebookUiCopy = getJsonData<DiaryNotebookUiCopy>(
    "diary-notebook-ui-data",
  );

  document
    .querySelectorAll<HTMLElement>("[data-feature-carousel-root]")
    .forEach((rootElement) => {
      createRoot(rootElement).render(
        <FeatureSpotCarousel
          cardsByLocale={featureCardsByLocale}
          initialLocale={initialLocale}
        />,
      );
    });

  document
    .querySelectorAll<HTMLElement>("[data-diary-notebook-root]")
    .forEach((rootElement) => {
      const layout =
        rootElement.dataset.diaryNotebookRoot === "modal" ? "modal" : "page";

      createRoot(rootElement).render(
        <DiaryNotebook
          entries={diaryEntries}
          initialLocale={initialLocale}
          layout={layout}
          uiCopy={diaryNotebookUiCopy}
        />,
      );
    });
};

renderReactIslands();
