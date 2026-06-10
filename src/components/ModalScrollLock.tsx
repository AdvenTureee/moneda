'use client';

import { useEffect } from 'react';

const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], [aria-modal="true"]';

type BodyScrollLockState = {
  scrollY: number;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
};

let lockState: BodyScrollLockState | null = null;

export default function ModalScrollLock() {
  useEffect(() => {
    const updateLock = () => {
      const hasOpenModal = document.querySelector(MODAL_SELECTOR) !== null;
      if (hasOpenModal) {
        lockBodyScroll();
      } else {
        unlockBodyScroll();
      }
    };

    updateLock();

    const observer = new MutationObserver(updateLock);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-modal', 'role'],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      unlockBodyScroll();
    };
  }, []);

  return null;
}

function lockBodyScroll() {
  if (lockState) return;

  const body = document.body;
  const html = document.documentElement;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  lockState = {
    scrollY,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    htmlOverflow: html.style.overflow,
  };

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockBodyScroll() {
  if (!lockState) return;

  const body = document.body;
  const html = document.documentElement;
  const { scrollY } = lockState;

  body.style.overflow = lockState.bodyOverflow;
  body.style.paddingRight = lockState.bodyPaddingRight;
  body.style.position = lockState.bodyPosition;
  body.style.top = lockState.bodyTop;
  body.style.width = lockState.bodyWidth;
  html.style.overflow = lockState.htmlOverflow;

  lockState = null;
  window.scrollTo(0, scrollY);
}
