import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandMark from "../../components/BrandMark";
import RollButton from "../../components/RollButton";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      const resData = err.response?.data;
      if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
        setError(resData.errors.map((e) => e.message).join(", "));
      } else {
        setError(resData?.message || "Registration failed");
      }
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
            Join Staple
          </h1>
          <p className="text-sm text-neutral-400">
            Claim your handle and start binding conversations.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-neutral-300">
              Full Name
            </label>
            <input
              type="text"
              maxLength={60}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Santanu Atta"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300">
              Username
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              value={form.username}
              onChange={(e) =>
                setForm({
                  ...form,
                  username: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, ""),
                })
              }
              placeholder="santanu"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300">Email</label>
            <input
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300">
              Password <span className="text-neutral-500">(min 12 chars)</span>
            </label>
            <input
              type="password"
              required
              minLength={12}
              maxLength={128}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 12 characters"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600"
            />
          </div>

          <RollButton
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2"
          >
            {submitting ? "Creating account..." : "Create account"}
          </RollButton>
        </form>

        <p className="text-center text-xs text-neutral-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}