import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  prefix?: string;
}

export function Input({ label, prefix, className = '', ...props }: InputProps) {
  return (
    <div className="mb-5">
      <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">
        {label}
      </label>
      <div className="flex gap-2.5">
        {prefix && (
          <span className="bg-dark-surface2 border border-dark-border rounded-[10px] px-5 py-3.5 text-base text-muted whitespace-nowrap text-center">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={`w-full bg-dark-surface2 border border-dark-border focus:border-gold rounded-[10px] px-4 py-3.5 text-base text-[#F0EDE8] placeholder-muted outline-none transition-colors font-sans ${className}`}
        />
      </div>
    </div>
  );
}
