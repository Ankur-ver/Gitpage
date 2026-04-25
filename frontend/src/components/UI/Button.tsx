import React from 'react';
import { motion } from 'framer-motion';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
  secondary: 'bg-bg-secondary hover:bg-bg-tertiary text-text-primary border-[#2a2a3a]',
  danger:    'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600/30',
  ghost:     'bg-transparent hover:bg-bg-tertiary text-text-secondary border-transparent',
  ai:        'bg-gradient-to-r from-indigo-500/20 to-purple-600/20 hover:from-indigo-500/30 hover:to-purple-600/30 text-indigo-400 border-indigo-500/30 ai-glow',
};

const sizeClasses = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-6 py-3 gap-2.5',
};

const Button: React.FC<Props> = ({
  children, variant = 'primary', size = 'md',
  loading = false, icon, className = '', disabled, ...rest
}) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center border rounded-lg font-medium
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    {...(rest as any)}
  >
    {loading ? (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ) : icon}
    {children}
  </motion.button>
);

export default Button;