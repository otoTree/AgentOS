import { useState, useRef, useEffect } from 'react';

export function useMeasure() {
  const ref = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      setBounds({ width, height });
    });

    resizeObserver.observe(element);

    return () => {
      if (element) resizeObserver.unobserve(element);
    };
  }, []);

  return { ref, bounds };
}
