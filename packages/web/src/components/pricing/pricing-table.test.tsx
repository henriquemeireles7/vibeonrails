import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PricingTable, type PricingPlan } from "./pricing-table.js";

// VOR: PricingTable test - plan rendering, checkout connection, accessibility

const samplePlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 9,
    interval: "month",
    description: "For individuals getting started",
    features: ["1 project", "Basic support", "1GB storage"],
    priceId: "price_starter_monthly",
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    interval: "month",
    description: "For growing teams",
    features: [
      "10 projects",
      "Priority support",
      "10GB storage",
      "Custom domain",
    ],
    priceId: "price_pro_monthly",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    description: "For large organizations",
    features: [
      "Unlimited projects",
      "24/7 support",
      "100GB storage",
      "Custom domain",
      "SLA",
    ],
    priceId: "price_enterprise_monthly",
  },
];

describe("PricingTable", () => {
  it("renders all plans with names and prices", () => {
    render(<PricingTable plans={samplePlans} />);

    expect(screen.getByText("Starter")).toBeDefined();
    expect(screen.getByText("Pro")).toBeDefined();
    expect(screen.getByText("Enterprise")).toBeDefined();

    expect(screen.getByText("$9")).toBeDefined();
    expect(screen.getByText("$29")).toBeDefined();
    expect(screen.getByText("$99")).toBeDefined();
  });

  it("renders plan descriptions", () => {
    render(<PricingTable plans={samplePlans} />);

    expect(screen.getByText("For individuals getting started")).toBeDefined();
    expect(screen.getByText("For growing teams")).toBeDefined();
    expect(screen.getByText("For large organizations")).toBeDefined();
  });

  it("renders feature lists for each plan", () => {
    render(<PricingTable plans={samplePlans} />);

    expect(screen.getByText("1 project")).toBeDefined();
    expect(screen.getByText("10 projects")).toBeDefined();
    expect(screen.getByText("Unlimited projects")).toBeDefined();
    expect(screen.getByText("24/7 support")).toBeDefined();
  });

  it("applies highlighted class to featured plan", () => {
    const { container } = render(<PricingTable plans={samplePlans} />);

    const highlightedCards = container.querySelectorAll(
      ".pricing-card-highlighted",
    );
    expect(highlightedCards.length).toBe(1);
  });

  it("calls onSelectPlan with correct priceId when CTA is clicked", () => {
    const onSelectPlan = vi.fn();
    render(<PricingTable plans={samplePlans} onSelectPlan={onSelectPlan} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // Pro plan button

    expect(onSelectPlan).toHaveBeenCalledWith("price_pro_monthly", "pro");
  });

  it("renders custom CTA text", () => {
    render(<PricingTable plans={samplePlans} ctaText="Subscribe Now" />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn.textContent).toBe("Subscribe Now");
    });
  });

  it("renders interval label correctly", () => {
    render(<PricingTable plans={samplePlans} />);

    const intervalLabels = screen.getAllByText("/month");
    expect(intervalLabels.length).toBe(3);
  });

  it("supports yearly interval", () => {
    const yearlyPlans: PricingPlan[] = [
      {
        id: "pro",
        name: "Pro",
        price: 290,
        interval: "year",
        description: "Annual billing",
        features: ["All features"],
        priceId: "price_pro_yearly",
      },
    ];

    render(<PricingTable plans={yearlyPlans} />);

    expect(screen.getByText("/year")).toBeDefined();
  });

  it("has accessible pricing table structure", () => {
    render(<PricingTable plans={samplePlans} />);

    // Each plan card should have a heading
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.length).toBe(3);

    // CTA buttons should be accessible
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(3);
  });

  it("renders empty state when no plans provided", () => {
    render(<PricingTable plans={[]} />);

    expect(screen.getByText("No plans available")).toBeDefined();
  });
});
