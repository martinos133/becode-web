'use client';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Potvrdiť',
  cancelLabel = 'Zrušiť',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: 'var(--becode-surface-elevated)',
          borderRadius: 'var(--becode-radius-lg)',
          border: '1px solid var(--becode-border)',
          padding: '1.75rem 2rem',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-modal-title"
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--becode-text)',
            marginBottom: '0.5rem',
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-modal-desc"
          style={{
            fontSize: '0.95rem',
            color: 'var(--becode-text-muted)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'transparent',
              color: 'var(--becode-text-muted)',
              border: '1px solid var(--becode-border)',
              borderRadius: 'var(--becode-radius)',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--becode-text-muted)';
              e.currentTarget.style.color = 'var(--becode-text)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--becode-border)';
              e.currentTarget.style.color = 'var(--becode-text-muted)';
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem',
              background:
                variant === 'danger'
                  ? 'var(--becode-danger)'
                  : 'var(--becode-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--becode-radius)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background =
                variant === 'danger'
                  ? 'var(--becode-danger-hover)'
                  : 'var(--becode-primary-hover)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background =
                variant === 'danger'
                  ? 'var(--becode-danger)'
                  : 'var(--becode-primary)';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
