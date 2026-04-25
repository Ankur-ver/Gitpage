import React from 'react';

type Variant = 'primary'|'success'|'warning'|'danger'|'info'|'purple'|'gray';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const variantMap: Record<Variant, string> = {
  primary: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  success: 'bg-green-500/15  text-green-400  border-green-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  danger:  'bg-red-500/15    text-red-400    border-red-500/30',
  info:    'bg-blue-500/15   text-blue-400   border-blue-500/30',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  gray:    'bg-gray-500/15   text-gray-400   border-gray-500/30',
};

const Badge: React.FC<Props> = ({ children, variant = 'primary', className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs
                    font-medium border ${variantMap[variant]} ${className}`}>
    {children}
  </span>
);

export default Badge;