import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@vibeonrails/web/components";

export function HomePage() {
  return (
    <div className="stack-lg p-lg" style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
      <h1>Welcome to Your App</h1>
      <p>Built with Vibe on Rails — the full-stack TypeScript framework.</p>
      <div className="row-center gap-md">
        <Link to="/login">
          <Button variant="primary">Sign In</Button>
        </Link>
        <Link to="/register">
          <Button variant="secondary">Register</Button>
        </Link>
      </div>
    </div>
  );
}
