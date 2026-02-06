import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input.js";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Input label="Email" error="Required field" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required field");
  });

  it("applies error styling class", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input.className).toContain("input-error");
  });

  it("sets aria-invalid when error is present", () => {
    render(<Input label="Email" error="Invalid" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders help text when no error", () => {
    render(<Input label="Email" helpText="We'll never share your email" />);
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
  });

  it("hides help text when error is present", () => {
    render(<Input label="Email" helpText="Help" error="Error" />);
    expect(screen.queryByText("Help")).not.toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);

    const input = screen.getByLabelText("Name");
    await user.type(input, "John");
    expect(input).toHaveValue("John");
  });
});
