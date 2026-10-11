import React from 'react';

export function Tabs({ tabs, activeTab, onChange, variant = 'pills', className = '' }) {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-border-subtle gap-6 ${className}`} role="tablist">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'text-brand-500 dark:text-brand-400 font-semibold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-brand rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex p-1 bg-surface-subtle dark:bg-surface-subtle border border-border-subtle rounded-xl ${className}`}
      role="tablist"
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 select-none ${
              isActive
                ? 'bg-surface dark:bg-surface-elevated text-content-primary shadow-sm font-semibold'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
