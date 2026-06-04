import { useEffect, useRef, useState } from "react";

export function useInViewOnce<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || active) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          ob.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [active, threshold]);

  return { ref, active };
}
