import React from 'react';

export function Avatar({
  name = 'User',
  role,
  size = 'md',
  className = '',
}) {
  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const roleGradients = {
    admin: 'from-purple-500 to-indigo-600',
    developer: 'from-blue-500 to-indigo-600',
    viewer: 'from-slate-500 to-slate-700',
  };

  const grad = roleGradients[role?.toLowerCase()] || 'from-indigo-500 via-purple-500 to-cyan-500';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-tr ${grad} text-white font-semibold font-heading shadow-sm shrink-0 select-none ${sizes[size] || sizes.md} ${className}`}
    >
      {getInitials(name)}
      {role && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${
            role === 'admin'
              ? 'bg-purple-500'
              : role === 'developer'
              ? 'bg-indigo-500'
              : 'bg-slate-400'
          }`}
          title={`Role: ${role}`}
        />
      )}
    </div>
  );
}

export function Kbd({ children, className = '' }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-content-secondary bg-surface-subtle dark:bg-surface-elevated border border-border-strong/70 rounded shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] ${className}`}
    >
      {children}
    </kbd>
  );
}
