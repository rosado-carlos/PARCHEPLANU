import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import CartPage from "./pages/cartPage";
import ConcertDetails from "./pages/concertDetails";
import HomePage from "./pages/homePage";
import LoginPage from "./pages/loginPage";
import NotFoundPage from "./pages/notFoundPage";
import ProfilePage from "./pages/profilePage";
import SignUpPage from "./pages/signUpPage";
import { getCurrentUser, logout } from "./services/parchePlanService";
import type { UserProfile } from "./types";

type ProtectedRoutesProps = {
  currentUser: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
};

function ProtectedRoutes({ currentUser, onProfileUpdated }: ProtectedRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<HomePage currentUser={currentUser} />} />
      <Route path="/profile" element={<ProfilePage currentUser={currentUser} onProfileUpdated={onProfileUpdated} />} />
      <Route path="/parches/:id" element={<CartPage currentUser={currentUser} />} />
      <Route path="/plans/:id" element={<ConcertDetails currentUser={currentUser} />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function PublicRoutes({ onLogin }: { onLogin: (user: UserProfile) => void }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
      <Route path="/signup" element={<SignUpPage onLogin={onLogin} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } finally {
        setLoadingSession(false);
      }
    }

    void loadSession();
  }, []);

  async function onLogout() {
    await logout();
    setCurrentUser(null);
  }

  return (
    <div className="min-h-screen bg-page">
      <Navbar currentUser={currentUser} onLogout={() => void onLogout()} />
      {loadingSession ? (
        <main className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted">Loading session...</main>
      ) : currentUser ? (
        <ProtectedRoutes currentUser={currentUser} onProfileUpdated={setCurrentUser} />
      ) : (
        <PublicRoutes onLogin={setCurrentUser} />
      )}
    </div>
  );
}
