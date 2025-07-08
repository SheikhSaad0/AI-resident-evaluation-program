import React from 'react';

interface GlassSelectProps {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export default function GlassSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = '',
  id,
  name,
  required
}: GlassSelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`glass-select ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}