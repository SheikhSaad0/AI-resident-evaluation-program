import React, { useState } from 'react';

interface PillToggleProps {
  options: { id: string; label: string }[];
  defaultSelected?: string;
  onChange: (selectedId: string) => void;
  className?: string;
}

export default function PillToggle({
  options,
  defaultSelected,
  onChange,
  className = ''
}: PillToggleProps) {
  const [selectedId, setSelectedId] = useState(defaultSelected || options[0]?.id);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onChange(id);
  };

  return (
    <div className={`pill-toggle ${className}`}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => handleSelect(option.id)}
          className={selectedId === option.id ? 'pill-option-active' : 'pill-option'}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}