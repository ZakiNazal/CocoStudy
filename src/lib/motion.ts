import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { CustomEase } from 'gsap/CustomEase';

/**
 * Duration palette. Motion personality is Premium/deliberate — a study tool
 * should not bounce. Every duration in the app comes from here.
 */
export const DUR = {
  instant: 0.12,
  quick: 0.18,
  base: 0.34,
  slow: 0.56,
  ritual: 1.2,
} as const;

export const EASE = {
  /** Signature curve — 80% of all motion. */
  signature: 'power2.inOut',
  /** Entrances decelerate. */
  out: 'power3.out',
  /** Exits accelerate. */
  in: 'power2.in',
  /** Highlighter drag: fast entry, slight drag, clean lift. */
  marker: 'marker',
} as const;

/** Stagger budgets. Total must stay under 0.5s. */
export const STAGGER = {
  micro: 0.03,
  standard: 0.06,
  dramatic: 0.12,
} as const;

let registered = false;

/** Registers plugins and the custom marker ease exactly once. */
export function registerMotion(): void {
  if (registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, Observer, CustomEase);
  CustomEase.create('marker', 'M0,0 C0.15,0.6 0.3,0.94 0.5,0.97 0.7,0.99 0.85,1 1,1');
  gsap.defaults({ ease: EASE.signature, duration: DUR.base });
  registered = true;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export { gsap, ScrollTrigger, Flip, Observer };
