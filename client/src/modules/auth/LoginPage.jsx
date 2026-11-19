import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandMark from "../../components/BrandMark";
import RollButton from "../../components/RollButton";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-7 backdrop-blur">
        <div className="space-y-2">
          <BrandMark size={32} />
          <h1 className="text-xl font-semibold text-white pt-2">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-400">
            Sign in to your feed and real-time threads.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-neutral-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-neutral-600"
            />
          </div>

          <RollButton
            type="submit"
            disabled={submitting}
            className="w-full py-2.5"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </RollButton>
        </form>

        <p className="text-center text-xs text-neutral-400">
          New to Staple?{" "}
          <Link to="/register" className="font-medium text-white hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}