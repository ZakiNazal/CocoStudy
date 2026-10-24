import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion';
import { ANTENNA_RUNS, BODY_RUNS, COCO_H, COCO_W, faceRuns, type CocoMood, type Run } from './sprite';

interface CocoSpriteProps {
  mood?: CocoMood;
  /** Rendered width in CSS pixels. Whole multiples of 26 stay crispest. */
  size?: number;
  /** Bob, sway and blink. Off for a still portrait, such as a chat avatar. */
  animated?: boolean;
  className?: string;
}

function Layer({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map(({ x, y, w, paint }) => (
        <rect key={`${x}:${y}`} x={x} y={y} width={w} height={1} fill={`var(--coco-${paint})`} />
      ))}
    </>
  );
}

/** Coco itself. Decorative: whatever hosts it carries the accessible name. */
export default function CocoSprite({
  mood = 'idle',
  size = 52,
  animated = true,
  className = '',
}: CocoSpriteProps) {
  const [blinking, setBlinking] = useState(false);

  // Only an idle Coco blinks; every other mood already has its own eyes.
  useEffect(() => {
    if (!animated || mood !== 'idle' || prefersReducedMotion()) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlinking(true);
          timer = window.setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 140);
        },
        2400 + Math.random() * 2600,
      );
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      setBlinking(false);
    };
  }, [animated, mood]);

  const face = blinking ? 'blink' : mood;

  return (
    <svg
      // One spare row above the bulb, so the bob never crops the antenna.
      viewBox={`0 -1 ${COCO_W} ${COCO_H + 1}`}
      width={size}
      height={(size * (COCO_H + 1)) / COCO_W}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`coco ${animated ? `coco-anim coco-${mood}` : ''} ${className}`}
    >
      <g className="coco-figure">
        <g className="coco-antenna">
          <Layer runs={ANTENNA_RUNS} />
        </g>
        <Layer runs={BODY_RUNS} />
        <Layer runs={faceRuns(face)} />
      </g>
    </svg>
  );
}
