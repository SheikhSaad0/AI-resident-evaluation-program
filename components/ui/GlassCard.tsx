import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ 
  children, 
  className = '', 
  variant = 'default',
  hover = false,
  onClick 
}: GlassCardProps) {
  const baseClasses = {
    default: 'glassmorphism',
    strong: 'glassmorphism-strong',
    subtle: 'glassmorphism-subtle'
  };

  const hoverClasses = hover ? 'card-hover cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseClasses[variant]} rounded-3xl ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}