import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import AuthPage from "./modules/auth/AuthPage";
import PostDetailsPage from "./modules/posts/PostDetailsPage";
import ProfilePage from "./modules/users/ProfilePage";
import NotificationPage from "./modules/notifications/NotificationPage";
import MessagePage from "./modules/messages/MessagePage";
import HomePage from "./modules/Home/HomePage";
import ExplorePage from "./modules/explore/ExplorePage";
import SettingsPage from "./modules/settings/SettingsPage";
import BookmarksPage from "./modules/bookmarks/BookmarksPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Auth Routes: if already authenticated, take directly to home */}
      <Route
        path="/signin"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/login"
        element={<Navigate to="/signin" replace />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/register"
        element={<Navigate to="/signup" replace />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <AuthPage initialMode="forgot" />}
      />
      <Route
        path="/reset-password"
        element={user ? <Navigate to="/" replace /> : <AuthPage initialMode="reset" />}
      />

      {/* Authenticated Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/post/:postId" element={<PostDetailsPage />} />
        <Route path="/u/:username" element={<ProfilePage />} /> 
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/messages" element={<MessagePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
