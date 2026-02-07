import React, { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      // Save the currently focused element before opening
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // Move focus into the dialog
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      // Restore focus to the element that was focused before the modal opened
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  const dialogClasses = ["modal", className].filter(Boolean).join(" ");

  return (
    <dialog
      ref={dialogRef}
      className={dialogClasses}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
      aria-labelledby={title ? "modal-title" : undefined}
      style={{
        border: "none",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        maxWidth: "32rem",
        width: "100%",
        boxShadow: "var(--shadow-xl)",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      {title && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h2
            id="modal-title"
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: "var(--font-semibold)",
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>
      )}
      {children}
    </dialog>
  );
}

Modal.displayName = "Modal";
