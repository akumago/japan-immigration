
import React, { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  label: string;
  description: string;
}

const Counter: React.FC<CounterProps> = ({ from = 0, to, duration = 2, suffix = '', prefix = '', label, description }) => {
  const nodeRef = useRef<HTMLParagraphElement>(null);
  const isInViewRef = useRef(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInViewRef.current) {
            isInViewRef.current = true;
            const controls = animate(from, to, {
              duration,
              onUpdate(value) {
                node.textContent = prefix + value.toFixed(0) + suffix;
              },
            });
            return () => controls.stop();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [from, to, duration, prefix, suffix]);

  return (
    <div className="text-center">
        <p className="text-4xl md:text-5xl font-serif font-extrabold text-red-500">
            <span ref={nodeRef}>{prefix}{from}{suffix}</span>
        </p>
        <h3 className="text-lg font-bold text-gray-200 mt-2">{label}</h3>
        <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
};

export default Counter;
