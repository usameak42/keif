import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { brewMethods, type BrewMethodId } from '@/data/brewMethods';
import { FilterItem } from '@/components/FilterTransition';

interface MethodSelectorProps {
  onSelect: (id: BrewMethodId) => void;
}

const ITEM_WIDTH = 140;
const COUNT = brewMethods.length;
const VISIBLE = 4;

const mod = (n: number, m: number) => ((n % m) + m) % m;

const brewerIcons: Record<BrewMethodId, React.ReactNode> = {
  v60: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <path d="M16 16 L32 52 L48 16" />
      <path d="M12 16 H52" />
      <line x1="32" y1="52" x2="32" y2="58" />
      <ellipse cx="32" cy="60" rx="8" ry="2" />
    </svg>
  ),
  espresso: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <path d="M14 28 H50 L46 38 H18 Z" />
      <line x1="32" y1="22" x2="32" y2="28" />
      <circle cx="32" cy="18" r="4" />
      <path d="M18 38 Q32 46 46 38" />
    </svg>
  ),
  'french-press': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <rect x="18" y="18" width="28" height="36" rx="2" />
      <line x1="32" y1="8" x2="32" y2="18" />
      <line x1="26" y1="8" x2="38" y2="8" />
      <line x1="18" y1="34" x2="46" y2="34" />
      <path d="M46 26 Q52 26 52 32 Q52 38 46 38" />
    </svg>
  ),
  'moka-pot': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <path d="M18 36 L14 54 H50 L46 36" />
      <path d="M22 36 L26 14 H38 L42 36" />
      <line x1="18" y1="36" x2="46" y2="36" />
      <circle cx="32" cy="10" r="3" />
      <path d="M46 44 Q52 44 52 48 Q52 52 46 52" />
    </svg>
  ),
  'kalita-wave': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <path d="M14 16 L22 48 H42 L50 16" />
      <path d="M10 16 H54" />
      <line x1="22" y1="48" x2="42" y2="48" />
      <path d="M20 28 Q24 26 28 28 Q32 30 36 28 Q40 26 44 28" />
      <path d="M21 36 Q25 34 29 36 Q33 38 37 36 Q41 34 43 36" />
    </svg>
  ),
  aeropress: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
      <rect x="22" y="20" width="20" height="34" rx="2" />
      <line x1="22" y1="48" x2="42" y2="48" />
      <line x1="32" y1="10" x2="32" y2="20" />
      <line x1="26" y1="10" x2="38" y2="10" />
      <ellipse cx="32" cy="56" rx="6" ry="2" />
    </svg>
  ),
};

const MethodSelector = ({ onSelect }: MethodSelectorProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragXMotion = useMotionValue(0);
  const dragRef = useRef({ startX: 0, isDragging: false, lastX: 0, lastTime: 0, velocity: 0 });

  const currentMethod = brewMethods[currentIndex];

  const snapTo = useCallback((steps: number) => {
    const newIndex = mod(currentIndex + steps, COUNT);
    // Animate dragX from current position to 0 (snapping the new center into place)
    const currentDragX = dragXMotion.get();
    const targetDragX = currentDragX - steps * ITEM_WIDTH;
    
    // First animate to the target position, then reset
    animate(dragXMotion, targetDragX, {
      type: 'spring',
      stiffness: 300,
      damping: 28,
      mass: 0.8,
      onComplete: () => {
        setCurrentIndex(newIndex);
        dragXMotion.set(0);
      },
    });
  }, [currentIndex, dragXMotion]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    d.isDragging = true;
    d.startX = e.clientX;
    d.lastX = e.clientX;
    d.lastTime = Date.now();
    d.velocity = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.isDragging) return;
    const deltaX = e.clientX - d.startX;
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) {
      d.velocity = (e.clientX - d.lastX) / dt;
    }
    d.lastX = e.clientX;
    d.lastTime = now;
    dragXMotion.set(deltaX);
  }, [dragXMotion]);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d.isDragging) return;
    d.isDragging = false;

    const currentDragX = dragXMotion.get();
    const momentum = d.velocity * 150;
    const totalOffset = currentDragX + momentum;
    // Negative steps = moved left = next item
    const steps = -Math.round(totalOffset / ITEM_WIDTH);
    
    if (steps === 0) {
      // Snap back to center
      animate(dragXMotion, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 28,
      });
    } else {
      const newIndex = mod(currentIndex + steps, COUNT);
      const snapTarget = -steps * ITEM_WIDTH;
      animate(dragXMotion, snapTarget, {
        type: 'spring',
        stiffness: 300,
        damping: 28,
        mass: 0.8,
        onComplete: () => {
          setCurrentIndex(newIndex);
          dragXMotion.set(0);
        },
      });
    }
  }, [dragXMotion, currentIndex]);

  const ticks = Array.from({ length: 13 }, (_, i) => i);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 select-none">
      {/* Header */}
      <FilterItem className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight font-display">
          KEIF
        </h1>
        <div className="w-16 h-[2px] bg-current opacity-20 mx-auto mt-3 mb-2" />
        <p className="text-muted-foreground text-[11px] mt-2 font-mono tracking-[0.3em] uppercase">
          Extraction Simulator
        </p>
      </FilterItem>

      {/* Rotary Dial Area */}
      <FilterItem className="w-full flex flex-col items-center">
        {/* Ambient glow */}
        <div
          className="absolute w-48 h-48 rounded-full blur-[80px] opacity-25 transition-colors duration-500 pointer-events-none"
          style={{ backgroundColor: currentMethod.colors.glow }}
        />

        {/* Tick marks top */}
        <div className="flex justify-center gap-[10px] mb-3 opacity-30">
          {ticks.map((i) => (
            <div
              key={i}
              className={`w-[2px] rounded-full bg-foreground ${i === 6 ? 'h-4 opacity-80' : 'h-2 opacity-40'}`}
            />
          ))}
        </div>

        {/* Dial container */}
        <div
          className="relative w-full overflow-hidden h-[180px] cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'pan-y' }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ x: dragXMotion }}
          >
            {Array.from({ length: VISIBLE * 2 + 1 }, (_, i) => {
              const rel = i - VISIBLE;
              const methodIndex = mod(currentIndex + rel, COUNT);
              const method = brewMethods[methodIndex];
              const isActive = rel === 0;
              const x = rel * ITEM_WIDTH;

              return (
                <div
                  key={`${methodIndex}-${rel}`}
                  className="absolute flex flex-col items-center justify-center gap-3"
                  style={{
                    width: ITEM_WIDTH,
                    transform: `translate3d(${x}px, 0, 0) scale(${isActive ? 1 : 0.8})`,
                    opacity: isActive ? 1 : 0.3,
                    willChange: 'transform',
                  }}
                >
                  <div style={{ color: method.colors.glow }}>
                    {brewerIcons[method.id]}
                  </div>
                  <span className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase text-foreground/80">
                    {method.shortName}
                  </span>
                  <span className="font-display text-[11px] text-muted-foreground">
                    {method.name}
                  </span>
                </div>
              );
            })}
          </motion.div>

          {/* Viewing window overlay */}
          <div className="rotary-window absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-full pointer-events-none z-10" />
        </div>

        {/* Tick marks bottom */}
        <div className="flex justify-center gap-[10px] mt-3 opacity-30">
          {ticks.map((i) => (
            <div
              key={i}
              className={`w-[2px] rounded-full bg-foreground ${i === 6 ? 'h-4 opacity-80' : 'h-2 opacity-40'}`}
            />
          ))}
        </div>

        {/* Arrow hints */}
        <div className="flex items-center gap-8 mt-6 text-muted-foreground/40">
          <button
            className="p-2 hover:text-foreground/60 transition-colors"
            onClick={() => snapTo(-1)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 4 L6 10 L12 16" />
            </svg>
          </button>
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase">rotate</span>
          <button
            className="p-2 hover:text-foreground/60 transition-colors"
            onClick={() => snapTo(1)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 4 L14 10 L8 16" />
            </svg>
          </button>
        </div>
      </FilterItem>

      {/* Brew button */}
      <FilterItem className="mt-10">
        <motion.button
          className="stamp-border rounded-lg px-10 py-3 font-mono text-[11px] font-semibold tracking-[0.3em] uppercase transition-colors"
          style={{
            borderColor: currentMethod.colors.primary,
            color: currentMethod.colors.glow,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(currentMethod.id)}
        >
          Brew
        </motion.button>
      </FilterItem>
    </div>
  );
};

export default MethodSelector;
