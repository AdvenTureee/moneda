'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaOptionsType } from 'embla-carousel';
import { motion, useReducedMotion } from 'framer-motion';

interface MotionCarouselProps {
  slides: ReactNode[];
  options?: EmblaOptionsType;
  className?: string;
  slideClassName?: string;
  renderControls?: (controls: {
    selectedIndex: number;
    scrollSnaps: number[];
    scrollPrev: () => void;
    scrollNext: () => void;
    scrollTo: (index: number) => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
  }) => ReactNode;
}

export function MotionCarousel({
  slides,
  options,
  className = '',
  slideClassName = '',
  renderControls,
}: MotionCarouselProps) {
  const reduceMotion = useReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    ...options,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    updateState();
    emblaApi.on('select', updateState);
    emblaApi.on('reInit', updateState);

    return () => {
      emblaApi.off('select', updateState);
      emblaApi.off('reInit', updateState);
    };
  }, [emblaApi, updateState]);

  return (
    <div className={className}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, index) => {
            const active = index === selectedIndex;
            return (
              <motion.div
                key={index}
                className={`min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_68%] lg:flex-[0_0_38%] ${slideClassName}`}
                animate={reduceMotion ? undefined : { scale: active ? 1 : 0.94, opacity: active ? 1 : 0.64 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {slide}
              </motion.div>
            );
          })}
        </div>
      </div>

      {renderControls?.({
        selectedIndex,
        scrollSnaps,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
      })}
    </div>
  );
}
