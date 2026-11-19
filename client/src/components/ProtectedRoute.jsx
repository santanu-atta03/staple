import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}