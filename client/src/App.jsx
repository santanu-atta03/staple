import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import FeedPage from "./modules/feed/FeedPage";
import PostDetailsPage from "./modules/posts/PostDetailsPage";
import ProfilePage from "./modules/users/ProfilePage";
import NotificationPage from "./modules/notifications/NotificationPage";
import HomePage from "./modules/Home/HomePage";

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/post/:postId" element={<PostDetailsPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}