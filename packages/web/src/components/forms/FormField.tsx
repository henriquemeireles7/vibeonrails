import React from "react";

// ---------------------------------------------------------------------------
// FormField — label + input + error message wrapper
// ---------------------------------------------------------------------------

export interface FormFieldProps {
  label: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

export function FormField({
  label,
  error,
  helpText,
  required,
  children,
  className,
}: FormFieldProps) {
  const fieldId =
    (children as React.ReactElement<{ id?: string }>).props?.id ??
    label.toLowerCase().replace(/\s+/g, "-");
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText && !error ? `${fieldId}-help` : undefined;

  const fieldClasses = ["stack stack-1", className].filter(Boolean).join(" ");

  return (
    <div className={fieldClasses}>
      <label htmlFor={fieldId} className="label">
        {label}
        {required && (
          <span style={{ color: "var(--color-error)", marginLeft: "var(--space-1)" }}>
            *
          </span>
        )}
      </label>
      {React.cloneElement(children, {
        id: fieldId,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": errorId ?? helpId,
      } as Record<string, unknown>)}
      {error && (
        <p id={errorId} className="error-text" role="alert">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={helpId} className="help-text">
          {helpText}
        </p>
      )}
    </div>
  );
}

FormField.displayName = "FormField";
