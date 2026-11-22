import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f5]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  return children;
}
