import React from 'react';

export function Container({ children, className = '', size = 'default', ...props }) {
  const sizes = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl',
    wide: 'max-w-[1440px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size] || sizes.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function GradientText({ children, className = '', ...props }) {
  return (
    <span
      className={`bg-clip-text text-transparent bg-gradient-brand ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  badge,
  title,
  subtitle,
  align = 'center',
  gradientWord,
  className = '',
}) {
  const alignments = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div className={`flex flex-col ${alignments[align] || alignments.center} max-w-2xl mx-auto mb-12 md:mb-16 ${className}`}>
      {badge && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
            {badge}
          </span>
        </div>
      )}

      <h2 className="text-h2 font-heading font-bold text-content-primary tracking-tight">
        {title}
        {gradientWord && (
          <>
            {' '}
            <GradientText>{gradientWord}</GradientText>
          </>
        )}
      </h2>

      {subtitle && (
        <p className="mt-3 text-base md:text-lg text-content-secondary leading-relaxed max-w-xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
