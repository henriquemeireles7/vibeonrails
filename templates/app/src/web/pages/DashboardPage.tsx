import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@vibeonrails/web/components";
import { Card } from "@vibeonrails/web/components";
import { useAuth } from "@vibeonrails/web/hooks";

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <div className="stack-lg p-lg" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="row-between">
        <h1>Dashboard</h1>
        <Button variant="ghost" onClick={logout}>Sign Out</Button>
      </div>

      <Card title={`Welcome, ${user?.name ?? "User"}`} description="Here's your dashboard overview.">
        <div className="stack-md">
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role ?? "user"}</p>
        </div>
      </Card>

      <div className="row gap-md">
        <Link to="/posts">
          <Button variant="secondary">View Posts</Button>
        </Link>
      </div>
    </div>
  );
}
