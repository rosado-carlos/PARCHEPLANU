import { FiLogOut, FiUser, FiUsers } from "react-icons/fi";
import { Link, NavLink } from "react-router-dom";
import type { UserProfile } from "../../types";
import Button from "../ui/Button";

type Props = {
  currentUser: UserProfile | null;
  onLogout: () => void;
};

export default function Navbar({ currentUser, onLogout }: Props) {
  const linkBase = "text-sm text-muted hover:text-text";
  const active = "font-semibold text-brand-700";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-text">
          <FiUsers className="text-brand-700" />
          <h2 className="m-0 text-lg font-semibold">ParchePlan U</h2>
        </Link>

        <nav className="flex items-center gap-4" aria-label="Primary navigation">
          {currentUser ? (
            <>
              <NavLink to="/" className={({ isActive }) => (isActive ? `${linkBase} ${active}` : linkBase)}>
                My Parches
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => (isActive ? `${linkBase} ${active}` : linkBase)}>
                <span className="inline-flex items-center gap-1">
                  <FiUser />
                  Profile
                </span>
              </NavLink>

              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-gray-50 text-muted">
                  <FiUser />
                </span>
              )}

              <span className="text-xs text-muted">{currentUser.fullName}</span>
              <Button variant="secondary" onClick={onLogout}>
                <FiLogOut />
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? `${linkBase} ${active}` : linkBase)}>
                Log in
              </NavLink>
              <NavLink to="/signup" className={({ isActive }) => (isActive ? `${linkBase} ${active}` : linkBase)}>
                Sign up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
