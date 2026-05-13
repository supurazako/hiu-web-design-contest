import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Locale, UiCopy } from "@/data/site";

type FeatureSpotCarouselProps = {
  cardsByLocale: Record<Locale, UiCopy[Locale]["featureCards"]>;
  initialLocale: Locale;
};

type LocaleChangeDetail = {
  locale: Locale;
};

const localeChangeEventName = "time-map:locale-change";
const autoplayResumeDelayMs = 3200;
const wheelSnapThreshold = 48;
const wheelGestureIdleMs = 220;
const publicAsset = (path: string) =>
  path.startsWith("/")
    ? `${import.meta.env.BASE_URL === "/" || import.meta.env.BASE_URL === "/./" ? "./" : import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`
    : path;

const FeatureSpotCardView = ({
  card,
  index,
}: {
  card: UiCopy[Locale]["featureCards"][number];
  index: number;
}) => {
  return (
    <Card className="h-full overflow-hidden rounded-[28px] border border-[color:var(--md-sys-color-outline-variant)] bg-[color:var(--md-sys-color-surface-container)] py-0 text-[color:var(--md-sys-color-on-surface)] shadow-[var(--md-elevation-2)]">
      <div className="grid h-full md:grid-cols-[minmax(0,0.95fr)_minmax(280px,1.08fr)]">
        <CardContent className="flex flex-col justify-center gap-5 px-6 py-7 md:px-8 md:py-9">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-base font-bold text-[color:var(--md-sys-color-on-primary-container)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="m-0 text-[1.35rem] font-bold leading-tight text-[color:var(--md-sys-color-on-surface)] md:text-[1.75rem]">
              {card.title}
            </h3>
          </div>
          <p className="max-w-[28ch] text-sm leading-7 text-[color:var(--md-sys-color-on-surface-variant)] md:text-[1.05rem] md:leading-8">
            {card.body}
          </p>
        </CardContent>

        <div className="relative min-h-[240px] overflow-hidden bg-[color:var(--md-sys-color-surface-container-high)] md:min-h-full">
          <img
            src={publicAsset(card.imageSrc)}
            alt={card.imageAlt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,242,0.06),rgba(24,28,34,0.16))]" />
        </div>
      </div>
    </Card>
  );
};

export default function FeatureSpotCarousel({
  cardsByLocale,
  initialLocale,
}: FeatureSpotCarouselProps) {
  const resumeTimerRef = React.useRef<number | null>(null);
  const wheelResetTimerRef = React.useRef<number | null>(null);
  const wheelDeltaRef = React.useRef(0);
  const wheelGestureLockedRef = React.useRef(false);
  const isHoveringRef = React.useRef(false);
  const isManualPausedRef = React.useRef(false);
  const autoplay = React.useRef(
    Autoplay({
      delay: 2500,
      stopOnInteraction: false,
    }),
  );
  const [api, setApi] = React.useState<CarouselApi>();
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const cards = cardsByLocale[locale] ?? cardsByLocale.ja;

  const clearResumeTimer = React.useCallback(() => {
    if (resumeTimerRef.current === null) return;
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  }, []);

  const startAutoplay = React.useCallback(() => {
    autoplay.current.play();
  }, []);

  const scheduleAutoplayResume = React.useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      if (isHoveringRef.current) {
        resumeTimerRef.current = null;
        return;
      }

      startAutoplay();
      isManualPausedRef.current = false;
      resumeTimerRef.current = null;
    }, autoplayResumeDelayMs);
  }, [clearResumeTimer, startAutoplay]);

  const clearWheelResetTimer = React.useCallback(() => {
    if (wheelResetTimerRef.current === null) return;
    window.clearTimeout(wheelResetTimerRef.current);
    wheelResetTimerRef.current = null;
  }, []);

  const stopAutoplayForInteraction = React.useCallback(() => {
    isManualPausedRef.current = true;
    autoplay.current.stop();
    clearResumeTimer();
  }, [clearResumeTimer]);

  React.useEffect(() => {
    const currentLocale =
      document.body.dataset.locale ?? document.documentElement.lang;
    if (currentLocale === "ja" || currentLocale === "en") {
      setLocale(currentLocale);
    }

    const handleLocaleChange = (event: Event) => {
      const { detail } = event as CustomEvent<LocaleChangeDetail>;
      if (!detail?.locale) return;
      setLocale(detail.locale);
    };

    window.addEventListener(localeChangeEventName, handleLocaleChange);
    return () => {
      window.removeEventListener(localeChangeEventName, handleLocaleChange);
    };
  }, []);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };
    const onPointerDown = () => {
      stopAutoplayForInteraction();
    };
    const onSettle = () => {
      if (!isManualPausedRef.current) return;
      scheduleAutoplayResume();
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    api.on("pointerDown", onPointerDown);
    api.on("settle", onSettle);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      api.off("pointerDown", onPointerDown);
      api.off("settle", onSettle);
    };
  }, [api, locale, scheduleAutoplayResume, stopAutoplayForInteraction]);

  React.useEffect(() => {
    if (!api) return;
    api.reInit();
    api.scrollTo(0, true);
    setSelectedIndex(0);
    isManualPausedRef.current = false;
    startAutoplay();
  }, [api, cards, startAutoplay]);

  React.useEffect(() => {
    return () => {
      clearResumeTimer();
      clearWheelResetTimer();
    };
  }, [clearResumeTimer, clearWheelResetTimer]);

  React.useEffect(() => {
    if (!api) return;

    const rootNode = api.rootNode();

    const handleWheel = (event: WheelEvent) => {
      const primaryDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;

      if (Math.abs(primaryDelta) < 4) return;

      event.preventDefault();
      stopAutoplayForInteraction();
      clearWheelResetTimer();

      const resetWheelGesture = () => {
        wheelDeltaRef.current = 0;
        wheelGestureLockedRef.current = false;
        scheduleAutoplayResume();
        wheelResetTimerRef.current = null;
      };

      wheelDeltaRef.current += primaryDelta;

      if (wheelGestureLockedRef.current) {
        wheelResetTimerRef.current = window.setTimeout(
          resetWheelGesture,
          wheelGestureIdleMs,
        );
        return;
      }

      if (wheelDeltaRef.current >= wheelSnapThreshold) {
        wheelGestureLockedRef.current = true;
        api.scrollNext();
        wheelResetTimerRef.current = window.setTimeout(
          resetWheelGesture,
          wheelGestureIdleMs,
        );
        return;
      }

      if (wheelDeltaRef.current <= -wheelSnapThreshold) {
        wheelGestureLockedRef.current = true;
        api.scrollPrev();
        wheelResetTimerRef.current = window.setTimeout(
          resetWheelGesture,
          wheelGestureIdleMs,
        );
        return;
      }

      wheelResetTimerRef.current = window.setTimeout(
        resetWheelGesture,
        wheelGestureIdleMs,
      );
    };

    rootNode.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      rootNode.removeEventListener("wheel", handleWheel);
    };
  }, [
    api,
    clearWheelResetTimer,
    scheduleAutoplayResume,
    stopAutoplayForInteraction,
  ]);

  return (
    <div
      className="space-y-5"
      onMouseEnter={() => {
        isHoveringRef.current = true;
        autoplay.current.stop();
        clearResumeTimer();
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        scheduleAutoplayResume();
      }}
    >
      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true,
        }}
        plugins={[autoplay.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {cards.map((card, index) => (
            <CarouselItem
              key={`${locale}-${card.imageSrc}-${card.body}`}
              className="basis-[88%] pl-4 sm:basis-[72%] lg:basis-full"
            >
              <FeatureSpotCardView card={card} index={index} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-2.5">
        {cards.map((card, index) => {
          const isActive = index === selectedIndex;
          return (
            <button
              key={`dot-${locale}-${card.imageSrc}-${index}`}
              type="button"
              onClick={() => {
                stopAutoplayForInteraction();
                api?.scrollTo(index);
                scheduleAutoplayResume();
              }}
              aria-label={`Slide ${index + 1}`}
              aria-current={isActive ? "true" : "false"}
              className={cn(
                "h-2.5 w-2.5 rounded-full border-0 p-0 transition-transform duration-200",
                isActive
                  ? "scale-110 bg-[color:var(--md-sys-color-primary)]"
                  : "bg-[color:var(--md-sys-color-outline)] opacity-50",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
