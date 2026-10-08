import React from 'react';

interface NumericInputProps {
  id?: string;
  name?: string;
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * NumericInput ensures that:
 * - Empty fields remain empty "" (not converted to "0")
 * - Typing "1" displays "1", NOT "01"
 * - Typing "30" displays "30", NOT "030"
 * - Null/empty states are handled gracefully
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder = '',
  min,
  max,
  className = '',
  disabled = false,
}) => {
  // Convert current value to string: null/undefined becomes empty string ""
  const displayValue = value === null || value === undefined ? '' : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If cleared, notify parent with null
    if (raw === '' || raw.trim() === '') {
      onChange(null);
      return;
    }

    // Only allow valid digits
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly === '') {
      onChange(null);
      return;
    }

    // Parse integer to strip any leading zeros cleanly (e.g. "01" -> 1)
    const num = parseInt(digitsOnly, 10);
    if (isNaN(num)) {
      onChange(null);
      return;
    }

    if (min !== undefined && num < min) {
      onChange(min);
      return;
    }

    if (max !== undefined && num > max) {
      onChange(max);
      return;
    }

    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      name={name}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums ${className}`}
    />
  );
};
