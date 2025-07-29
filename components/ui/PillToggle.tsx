import React from 'react';

interface PillToggleOption {
  id: string;
  label: string;
}

interface PillToggleProps {
  options: PillToggleOption[];
  value: string; // Changed from defaultSelected
  onChange: (id: string) => void;
  className?: string;
}

export default function PillToggle({
  options,
  value, // Use value prop
  onChange,
  className = ''
}: PillToggleProps) {
  return (
    <div className={`glassmorphism-subtle p-1 rounded-full flex items-center space-x-1 ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`
              w-full text-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300
              ${isSelected
                ? 'bg-brand-primary/80 text-white shadow-md'
                : 'text-text-tertiary hover:bg-glass-200/50'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}