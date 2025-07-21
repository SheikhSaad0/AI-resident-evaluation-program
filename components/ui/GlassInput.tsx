// In components/GlassInput.tsx

import React from 'react';

// Define the props for the GlassInput component
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  // Explicitly add onKeyDown to the component's props
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const GlassInput: React.FC<GlassInputProps> = ({ className = '', ...props }) => {
  const baseStyle = "w-full bg-black bg-opacity-20 border border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-500 rounded-lg py-2 px-4 text-white placeholder-gray-400 transition-all duration-300 ease-in-out outline-none";
  
  // The 'onKeyDown' prop is now included in '...props' and will be passed to the input element
  return <input className={`${baseStyle} ${className}`} {...props} />;
};

export default GlassInput;