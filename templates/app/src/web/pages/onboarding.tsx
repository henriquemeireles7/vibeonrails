// VOR: Pre-built onboarding flow for SaaS template
// landing page -> signup -> select plan -> pay -> dashboard
// Every step works out of the box. First customer can pay before business logic.

import React from "react";

/**
 * Represents one step in the onboarding flow.
 */
export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** Display label for the step indicator */
  label: string;
}

export interface OnboardingFlowProps {
  /** Array of steps in order */
  steps: OnboardingStep[];
  /** Current active step ID */
  currentStep: string;
  /** Array of completed step IDs */
  completedSteps?: string[];
  /** Callback when user completes the current step */
  onStepComplete: (stepId: string) => void;
  /** Custom renderer for step content */
  renderStep?: (stepId: string) => React.ReactNode;
  /** Whether the current step is valid and can proceed */
  isStepValid?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * OnboardingFlow component.
 * SaaS template includes: landing -> signup -> select plan -> pay -> dashboard.
 * Every step works out of the box.
 */
export function OnboardingFlow({
  steps,
  currentStep,
  completedSteps = [],
  onStepComplete,
  renderStep,
  isStepValid = true,
  className,
}: OnboardingFlowProps): React.JSX.Element {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const completedSet = new Set(completedSteps);

  const classes = ["onboarding-flow", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {/* Step indicators */}
      <nav aria-label="Onboarding progress" className="onboarding-nav">
        <ol className="onboarding-steps" role="list">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = completedSet.has(step.id);
            const stepClasses = [
              "onboarding-step",
              isActive ? "onboarding-step-active" : undefined,
              isCompleted ? "onboarding-step-completed" : undefined,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li key={step.id} className={stepClasses}>
                <span className="onboarding-step-number" aria-hidden="true">
                  {isCompleted ? "\u2713" : index + 1}
                </span>
                <span className="onboarding-step-label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress text */}
      <p className="onboarding-progress sr-only-no" aria-live="polite">
        Step {currentIndex + 1} of {steps.length}
      </p>

      {/* Step content */}
      <div className="onboarding-content" role="main">
        {renderStep ? renderStep(currentStep) : null}
      </div>

      {/* Continue button */}
      <div className="onboarding-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onStepComplete(currentStep)}
          disabled={!isStepValid}
          aria-label="Continue to next step"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
