import React from 'react';
import Image from 'next/image';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick,
  className = ''
}: StatCardProps) {
  return (
    <div 
      className={`
        glassmorphism p-6 rounded-3xl
        ${onClick ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-tertiary text-sm font-medium mb-1">{title}</p>
          <p className="heading-lg">{value}</p>
          {subtitle && (
            <p className="text-text-quaternary text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`
              flex items-center mt-2 text-sm font-medium
              ${trend.isPositive ? 'text-brand-secondary' : 'text-red-400'}
            `}>
              <span className={`mr-1 ${trend.isPositive ? '↗' : '↘'}`}>
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        {icon && (
          <div className="glassmorphism-subtle p-3 rounded-2xl ml-4">
            <Image src={icon} alt={title} width={24} height={24} className="opacity-80" />
          </div>
        )}
      </div>
    </div>
  );
}