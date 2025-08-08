import React, { useEffect, useMemo, useRef } from 'react';

/**
 * CollageAnimatedIcon
 * Compact, reusable animated collage icon.
 * - Uses a FLIP animation to "split" tiles where new tiles appear from behind.
 * - Respects prefers-reduced-motion and pauses on tab hidden.
 *
 * Props
 * - size: number|string (CSS width/height), default 64
 * - gap: number (px) | undefined — if omitted, scales with size
 * - radius: number (px) | undefined — if omitted, scales with size
 * - shadow: string (CSS box-shadow), default '0 6px 18px rgba(0,0,0,.22)'
 * - colors: string[] of 5 colors, default ROYGB set
 * - moveDurationMs: number, default 520
 * - holdDurationMs: number, default 820
 * - easing: string (cubic-bezier), default 'cubic-bezier(.22,.61,.36,1)'
 * - paused: boolean, externally control play/pause
 * - className: string, optional
 * - style: React.CSSProperties, optional
 * - ariaLabel: string, optional (defaults provided)
 */
export default function CollageAnimatedIcon({
  size = 64,
  gap,
  radius,
  shadow = '0 6px 18px rgba(0,0,0,.22)',
  colors = ['#e4002b', '#ff6900', '#f6be00', '#97d700', '#00a3e0'],
  moveDurationMs = 520,
  holdDurationMs = 820,
  easing = 'cubic-bezier(.22,.61,.36,1)',
  paused = false,
  className,
  style,
  ariaLabel,
}){
  const gridRef = useRef(null);
  const tileRefs = useRef(Array.from({ length: 5 }, () => React.createRef()));
  const baseZRef = useRef([5,4,3,2,1]);
  const prevShowRef = useRef([true, false, false, false, false]);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const resizeRAFRef = useRef(null);
  const reduceMotionRef = useRef(false);

  // Compute a size-relative gap and radius when not provided
  const numericSize = typeof size === 'number'
    ? size
    : (typeof size === 'string' && size.endsWith('px') ? parseFloat(size) : 64);
  const computedGap = (gap ?? Math.max(2, Math.min(14, Math.round(numericSize * 0.09))));
  const computedRadius = (radius ?? Math.max(3, Math.min(16, Math.round(numericSize * 0.11))));

  const STAGES = useMemo(() => ([
    // 1) Hero full-bleed
    {
      columns: '1fr', rows: '1fr', gap: computedGap,
      items: [
        { r1:1, c1:1, r2:2, c2:2, show:true },
        { r1:1, c1:1, r2:2, c2:2, show:false },
        { r1:1, c1:1, r2:2, c2:2, show:false },
        { r1:1, c1:1, r2:2, c2:2, show:false },
        { r1:1, c1:1, r2:2, c2:2, show:false },
      ]
    },
    // 2) Golden split
    {
      columns: '1.618fr 1fr', rows: '1fr', gap: computedGap,
      items: [
        { r1:1, c1:1, r2:2, c2:2, show:true },
        { r1:1, c1:2, r2:2, c2:3, show:true },
        { r1:1, c1:2, r2:2, c2:3, show:false },
        { r1:1, c1:1, r2:2, c2:2, show:false },
        { r1:1, c1:2, r2:2, c2:3, show:false },
      ]
    },
    // 3) Feature-left with two stacked right
    {
      columns: '1.45fr 1fr', rows: '1fr 1fr', gap: computedGap,
      items: [
        { r1:1, c1:1, r2:3, c2:2, show:true },
        { r1:1, c1:2, r2:2, c2:3, show:true },
        { r1:2, c1:2, r2:3, c2:3, show:true },
        { r1:2, c1:2, r2:3, c2:3, show:false },
        { r1:2, c1:2, r2:3, c2:3, show:false },
      ]
    },
    // 4) Staggered mosaic
    {
      columns: '1.15fr 1fr 1fr', rows: '1fr 1fr', gap: computedGap,
      items: [
        { r1:1, c1:1, r2:3, c2:2, show:true },
        { r1:1, c1:2, r2:2, c2:3, show:true },
        { r1:1, c1:3, r2:2, c2:4, show:true },
        { r1:2, c1:2, r2:3, c2:4, show:true },
        { r1:2, c1:3, r2:3, c2:4, show:false },
      ]
    },
    // 5) Feature left + 2x2 right
    {
      columns: '1.3fr 1fr 1fr', rows: '1fr 1fr', gap: computedGap,
      items: [
        { r1:1, c1:1, r2:3, c2:2, show:true },
        { r1:1, c1:2, r2:2, c2:3, show:true },
        { r1:1, c1:3, r2:2, c2:4, show:true },
        { r1:2, c1:2, r2:3, c2:3, show:true },
        { r1:2, c1:3, r2:3, c2:4, show:true },
      ]
    }
  ]), [computedGap]);

  // Utilities
  function overlapArea(a, b){
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  }
  function center(rect){ return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 }; }

  function applyStage(stageIdx, { animate = true } = {}){
    const grid = gridRef.current;
    if(!grid) return;

    const tiles = tileRefs.current.map(r => r.current).filter(Boolean);
    if(tiles.length !== 5) return;

    const stage = STAGES[stageIdx % STAGES.length];

    // FIRST — rects before changes
    const first = tiles.map(t => t.getBoundingClientRect());

    // Apply layout for all tiles
    grid.style.gridTemplateColumns = stage.columns;
    grid.style.gridTemplateRows = stage.rows;
    grid.style.gap = String(stage.gap ?? computedGap) + 'px';

    stage.items.forEach((pos, i) => {
      const t = tiles[i];
      t.style.gridColumn = `${pos.c1} / ${pos.c2}`;
      t.style.gridRow = `${pos.r1} / ${pos.r2}`;
      t.dataset.show = pos.show ? '1' : '0';
      const was = prevShowRef.current[i];
      t.style.opacity = pos.show ? (was ? '1' : '0') : '0';
      t.style.zIndex = String(baseZRef.current[i]);
    });

    // Force layout
    grid.getBoundingClientRect();

    // LAST — rects after changes
    const last = tiles.map(t => t.getBoundingClientRect());

    if(!animate || reduceMotionRef.current){
      prevShowRef.current = stage.items.map(it => !!it.show);
      return;
    }

    tiles.forEach((t, i) => {
      const was = prevShowRef.current[i];
      const will = stage.items[i].show;
      let F = first[i];
      const L = last[i];

      // Cancel prior animations
      if (typeof t.getAnimations === 'function') {
        t.getAnimations().forEach(a => a.cancel());
      }

      // Newly appearing tiles start from the most-overlapping previous rect
      if(!was && will){
        let bestIdx = -1, bestOverlap = -1;
        for(let j=0;j<tiles.length;j++){
          if(!prevShowRef.current[j]) continue;
          const ov = overlapArea(first[j], L);
          if(ov > bestOverlap){ bestOverlap = ov; bestIdx = j; }
        }
        if(bestIdx === -1){
          // fallback: nearest center among previously visible
          let bestD = Infinity;
          const Lc = center(L);
          for(let j=0;j<tiles.length;j++){
            if(!prevShowRef.current[j]) continue;
            const C = center(first[j]);
            const d = Math.hypot(C.x - Lc.x, C.y - Lc.y);
            if(d < bestD){ bestD = d; bestIdx = j; }
          }
        }
        if(bestIdx !== -1){ F = first[bestIdx]; }
      }

      const dx = F.left - L.left;
      const dy = F.top - L.top;
      const sx = F.width / L.width;
      const sy = F.height / L.height;

      const appearKF = [
        { transform:`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
        { transform:'translate(0,0) scale(1,1)', opacity: 1 }
      ];

      const moveKF = [
        { transform:`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform:'translate(0,0) scale(1,1)' }
      ];

      const disappearKF = [
        { transform:'translate(0,0) scale(1,1)', opacity:1 },
        { transform:'translate(0,0) scale(.985,.985)', opacity:0 }
      ];

      const duration = moveDurationMs;
      const delay = i * 12;

      // If WAAPI is unavailable, skip animating
      if (typeof t.animate !== 'function') {
        return;
      }

      if(!was && will){
        t.animate(appearKF, { duration, easing, delay, fill:'both' });
      } else if(was && !will){
        t.animate(disappearKF, { duration: Math.max(240, moveDurationMs * 0.6), easing, delay, fill:'both' });
      } else {
        t.animate(moveKF, { duration, easing, delay, fill:'both' });
      }
    });

    prevShowRef.current = stage.items.map(it => !!it.show);
  }

  // Lifecycle
  useEffect(() => {
    // Reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = mq.matches;
    const onMq = () => { reduceMotionRef.current = mq.matches; };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
    else if (typeof mq.addListener === 'function') mq.addListener(onMq);

    // Initial layout
    indexRef.current = 0;
    applyStage(indexRef.current, { animate: false });

    // Keep FLIP accurate if container size changes
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRAFRef.current);
      resizeRAFRef.current = requestAnimationFrame(() => applyStage(indexRef.current, { animate:false }));
    });
    if (gridRef.current) ro.observe(gridRef.current);

    // Pause when tab is hidden
    const onVis = () => {
      if(document.hidden) stop(); else maybeStart();
    };
    document.addEventListener('visibilitychange', onVis);

    // Start
    maybeStart();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      if (gridRef.current) ro.disconnect();
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMq);
      else if (typeof mq.removeListener === 'function') mq.removeListener(onMq);
      cancelAnimationFrame(resizeRAFRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to external pause/resume
  useEffect(() => {
    if (paused) stop(); else maybeStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, moveDurationMs, holdDurationMs]);

  function tick(){
    indexRef.current = (indexRef.current + 1) % STAGES.length;
    applyStage(indexRef.current);
  }

  function maybeStart(){
    if (timerRef.current || reduceMotionRef.current || paused) return;
    timerRef.current = window.setInterval(tick, moveDurationMs + holdDurationMs);
  }

  function stop(){
    if (!timerRef.current) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // Styles
  const wrapperSize = typeof size === 'number' ? `${size}px` : size;
  const wrapperStyle = {
    width: wrapperSize,
    height: wrapperSize,
    display: 'inline-grid',
    placeItems: 'center',
    perspective: '1000px',
    ...style,
  };

  const gridStyle = {
    width: '100%',
    height: '100%',
    display: 'grid',
    gap: `${computedGap}px`,
    position: 'relative',
  };

  const tileBaseStyle = {
    position: 'relative',
    borderRadius: `${computedRadius}px`,
    boxShadow: shadow + ', inset 0 0 0 1px rgba(0,0,0,.08)',
    willChange: 'transform, opacity',
    pointerEvents: 'none',
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    transformOrigin: '0 0',
    overflow: 'hidden',
  };

  const label = ariaLabel || 'Animated collage icon of rainbow tiles';

  return (
    <div className={className} style={wrapperStyle} aria-label={label} role="img">
      <div ref={gridRef} style={gridStyle}>
        {tileRefs.current.map((ref, i) => (
          <div
            key={i}
            ref={ref}
            style={{
              ...tileBaseStyle,
              background: colors[i % colors.length],
              zIndex: String(baseZRef.current[i]),
              opacity: i === 0 ? 1 : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}


