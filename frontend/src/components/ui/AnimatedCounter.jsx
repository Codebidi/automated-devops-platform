import React, { useState, useEffect, useRef } from 'react';

export function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  // If value is non-numeric (e.g. "1-Click" or "0"), handle appropriately
  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10) || 0;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(numericValue);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(node);

          let startTime = null;
          const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out expo
            const current = Math.floor(progress * numericValue);
            setCount(current);

            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              setCount(numericValue);
            }
          };

          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [numericValue, duration, hasStarted]);

  return (
    <span ref={ref} className="font-heading font-extrabold tracking-tight">
      {prefix}
      {count}
      {suffix}
    </span>
  );
}
