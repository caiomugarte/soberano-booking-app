interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${checked ? 'bg-gold' : 'bg-dark-border'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      {label && (
        <span
          className="text-sm font-medium text-white cursor-pointer select-none"
          onClick={() => onChange(!checked)}
        >
          {label}
        </span>
      )}
    </div>
  );
}
