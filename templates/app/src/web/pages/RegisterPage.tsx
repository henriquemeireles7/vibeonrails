import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@vibeonrails/web/components";
import { useAuth } from "@vibeonrails/web/hooks";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/trpc/auth.register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { name, email, password } }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message ?? "Registration failed");
        return;
      }

      login(data.result.data.json.user, data.result.data.json.accessToken, data.result.data.json.refreshToken);
      navigate("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-lg p-lg" style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit} className="stack-md">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error-text">{error}</p>}
        <Button type="submit" loading={loading}>Create Account</Button>
      </form>
      <p>
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </div>
  );
}
