import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-dark-surface border border-dark-border rounded-xl ${className}`}>
      {title && (
        <>
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <div className="border-t border-dark-border" />
        </>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
