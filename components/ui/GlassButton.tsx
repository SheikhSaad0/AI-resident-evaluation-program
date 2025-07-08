import React from 'react';
import Image from 'next/image';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function GlassButton({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  type = 'button'
}: GlassButtonProps) {
  const variantClasses = {
    primary: 'glass-button-primary',
    secondary: 'glass-button-secondary',
    ghost: 'glassmorphism-subtle hover:bg-glass-200'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-2xl',
    md: 'px-6 py-3 text-base rounded-3xl',
    lg: 'px-8 py-4 text-lg rounded-3xl'
  };

  const disabledClasses = disabled || loading 
    ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-glass' 
    : '';

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${disabledClasses}
        font-medium transition-all duration-300 
        hover:shadow-glass-lg hover:scale-105 active:scale-95
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <Image src={icon} alt="" width={20} height={20} />
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && !loading && (
        <Image src={icon} alt="" width={20} height={20} />
      )}
    </button>
  );
}