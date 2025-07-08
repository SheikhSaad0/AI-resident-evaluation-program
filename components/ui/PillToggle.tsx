import React, { useState } from 'react';

interface PillToggleProps {
  options: { id: string; label: string }[];
  defaultSelected?: string;
  onChange?: (selectedId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PillToggle({ 
  options, 
  defaultSelected, 
  onChange,
  className = '',
  size = 'md'
}: PillToggleProps) {
  const [selected, setSelected] = useState(defaultSelected || options[0]?.id);

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    onChange?.(optionId);
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  };

  return (
    <div className={`pill-toggle ${sizeClasses[size]} ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSelect(option.id)}
          className={selected === option.id ? 'pill-option-active' : 'pill-option'}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}