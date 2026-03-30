import { type ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, children }: PanelProps) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-7 mb-5 animate-[fadeUp_0.4s_ease]">
      <h2 className="text-[22px] font-bold mb-1.5">{title}</h2>
      {subtitle && <p className="text-[13px] text-muted mb-5">{subtitle}</p>}
      {children}
    </div>
  );
}
