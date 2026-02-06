import React from "react";

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  const cardClasses = ["card", className].filter(Boolean).join(" ");

  return (
    <div className={cardClasses}>
      {(title || description) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {description && <p className="card-description">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

Card.displayName = "Card";
