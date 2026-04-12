import { ReactNode } from 'react';

type BadgeVariant = 'active' | 'inactive' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  active: 'border border-gold/40 text-gold bg-gold/10',
  inactive: 'border border-dark-border text-muted bg-dark-surface2',
  default: 'border border-dark-border text-muted bg-dark-surface2',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
