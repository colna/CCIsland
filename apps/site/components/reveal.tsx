"use client";

import { useEffect, useRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );

    observer.observe(el);

    // Safety fallback: force visible after 3s in case observer never fires
    const fallback = setTimeout(() => {
      if (el && !el.classList.contains("visible")) {
        el.classList.add("visible");
      }
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  const Component = Tag as React.ElementType;

  return (
    <Component
      ref={ref}
      className={`${className.includes("reveal-scale") ? "" : "reveal"} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Component>
  );
}
