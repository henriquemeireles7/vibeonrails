import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingFlow, type OnboardingStep } from "./onboarding.js";

// VOR: Onboarding flow test - full signup -> plan selection -> checkout -> dashboard

describe("OnboardingFlow", () => {
  const defaultSteps: OnboardingStep[] = [
    { id: "signup", label: "Create Account" },
    { id: "plan", label: "Select Plan" },
    { id: "checkout", label: "Payment" },
    { id: "welcome", label: "Get Started" },
  ];

  it("renders all step indicators", () => {
    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="signup"
        onStepComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Create Account")).toBeDefined();
    expect(screen.getByText("Select Plan")).toBeDefined();
    expect(screen.getByText("Payment")).toBeDefined();
    expect(screen.getByText("Get Started")).toBeDefined();
  });

  it("marks current step as active", () => {
    const { container } = render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="plan"
        onStepComplete={vi.fn()}
      />,
    );

    const activeSteps = container.querySelectorAll(".onboarding-step-active");
    expect(activeSteps.length).toBe(1);
  });

  it("marks completed steps", () => {
    const { container } = render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="plan"
        completedSteps={["signup"]}
        onStepComplete={vi.fn()}
      />,
    );

    const completedSteps = container.querySelectorAll(
      ".onboarding-step-completed",
    );
    expect(completedSteps.length).toBe(1);
  });

  it("calls onStepComplete when step action is triggered", () => {
    const onStepComplete = vi.fn();

    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="signup"
        onStepComplete={onStepComplete}
      />,
    );

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(onStepComplete).toHaveBeenCalledWith("signup");
  });

  it("renders step content via renderStep prop", () => {
    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="signup"
        onStepComplete={vi.fn()}
        renderStep={(stepId) => (
          <div data-testid={`step-content-${stepId}`}>Content for {stepId}</div>
        )}
      />,
    );

    expect(screen.getByTestId("step-content-signup")).toBeDefined();
    expect(screen.getByText("Content for signup")).toBeDefined();
  });

  it("shows progress indicator", () => {
    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="plan"
        completedSteps={["signup"]}
        onStepComplete={vi.fn()}
      />,
    );

    // Step 2 of 4
    expect(screen.getByText("Step 2 of 4")).toBeDefined();
  });

  it("has accessible navigation structure", () => {
    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="signup"
        onStepComplete={vi.fn()}
      />,
    );

    const nav = screen.getByRole("navigation", { name: /onboarding/i });
    expect(nav).toBeDefined();
  });

  it("disables continue button when step is not valid", () => {
    render(
      <OnboardingFlow
        steps={defaultSteps}
        currentStep="signup"
        onStepComplete={vi.fn()}
        isStepValid={false}
      />,
    );

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toHaveProperty("disabled", true);
  });
});
