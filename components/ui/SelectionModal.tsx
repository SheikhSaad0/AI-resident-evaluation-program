// components/ui/SelectionModal.tsx
import React from 'react';
import { GlassCard, GlassButton } from './';

interface SelectionModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <GlassCard variant="strong" className="w-full max-w-2xl max-h-[80vh] flex flex-col p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-md text-text-primary">{title}</h2>
          <GlassButton variant="ghost" onClick={onClose} className="!p-2">
            &times;
          </GlassButton>
        </div>
        <div className="overflow-y-auto scrollbar-glass pr-2">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

export default SelectionModal;