
import React from 'react';
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
  id?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, id }) => {
  return (
    <section className="mb-16" id={id}>
      <h2 className="text-3xl font-serif font-bold text-blue-400 mb-8 pb-4 border-b-2 border-gray-700">
        {title}
      </h2>
      {children}
    </section>
  );
};

export default Section;