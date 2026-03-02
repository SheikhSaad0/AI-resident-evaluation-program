// components/ui/PillToggle.tsx
import React from 'react';

export interface PillToggleOption {
  id: string;
  label: string;
}

export interface PillToggleProps {
  options: PillToggleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function PillToggle({ 
  options, 
  value, 
  onChange, 
  disabled = false,
  className = ''
}: PillToggleProps) {
  return (
    <div 
      className={`flex p-1 space-x-1 rounded-full glassmorphism-subtle border border-glass-border transition-opacity duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => !disabled && onChange(option.id)}
            disabled={disabled}
            className={`relative flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full focus:outline-none ${
              isActive 
                ? 'bg-brand-primary text-white shadow-lg border border-white/20' 
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
            } ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}