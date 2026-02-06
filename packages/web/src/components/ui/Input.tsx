import React from "react";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = error ? `${inputId}-error` : undefined;
    const helpId = helpText && !error ? `${inputId}-help` : undefined;

    const inputClasses = ["input", error && "input-error", className]
      .filter(Boolean)
      .join(" ");

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId ?? helpId}
          {...props}
        />
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
  },
);

Input.displayName = "Input";
