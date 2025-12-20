import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = ({
  checked,
  onChange,
  label,
  helperText,
  disabled = false,
  className,
}: SwitchProps) => {
  return (
    <label
      className={clsx(
        'flex items-start gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={clsx(
            'w-10 h-5 rounded-full transition-colors duration-300',
            checked ? 'bg-primary' : 'bg-surface-dark border border-border',
          )}
        >
          <div
            className={clsx(
              'w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all duration-300',
              checked ? 'left-5' : 'left-0.5',
            )}
          />
        </div>
      </div>
      {(label || helperText) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-white font-medium">{label}</span>}
          {helperText && <span className="text-xs text-text-muted">{helperText}</span>}
        </div>
      )}
    </label>
  );
};
