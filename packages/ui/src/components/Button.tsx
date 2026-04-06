import { type ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ loading, variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        {...props}
        disabled={disabled || loading}
        className={`w-full text-center text-sm text-muted hover:text-[#F0EDE8] transition-colors py-2 mt-2 cursor-pointer bg-transparent border-none ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`w-full py-4 bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none text-dark font-bold text-sm tracking-widest uppercase rounded-[10px] transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(201,169,110,0.3)] relative overflow-hidden cursor-pointer ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {children}
        </span>
      ) : children}
    </button>
  );
}
