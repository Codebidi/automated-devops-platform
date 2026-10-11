import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} bg-surface dark:bg-surface-elevated border border-border-subtle rounded-2xl shadow-elevated overflow-hidden z-10 transition-all transform animate-fade-up outline-none`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-start justify-between p-5 border-b border-border-subtle">
            <div>
              {title && (
                <h3 id="modal-title" className="text-lg font-heading font-semibold text-content-primary">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-content-secondary leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-subtle rounded-xl transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 bg-surface-subtle/50 dark:bg-surface-subtle/20 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
