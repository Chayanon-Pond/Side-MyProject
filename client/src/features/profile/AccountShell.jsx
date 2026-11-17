import { Link, NavLink } from "react-router-dom";
import { KeyRound, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { avatarUrl, imgFallback, DEFAULT_AVATAR } from "../../lib/assets";
import { displayName } from "../../lib/format";

const tabs = [
  { to: "/profile", label: "Profile", Icon: User },
  { to: "/reset-password", label: "Reset password", Icon: KeyRound, end: true },
];

/** Header + side navigation shared by the user's Profile and Reset-password pages. */
const AccountShell = ({ title, avatarSrc, children }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-fg">Please log in to continue</h1>
          <Link to="/login" className="text-papaya-ink hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-surface rounded-[6px] border border-line">
          <div className="flex items-center space-x-4 p-6 border-b">
            <div className="w-16 h-16 bg-line rounded-full overflow-hidden">
              <img
                src={avatarSrc || avatarUrl(user.profile_image_url)}
                onError={imgFallback(DEFAULT_AVATAR)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{displayName(user)}</p>
              <h1 className="text-xl text-muted">{title}</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            <nav className="md:w-1/4 p-6 md:border-r bg-bg" aria-label="Account">
              <ul className="space-y-2">
                {tabs.map(({ to, label, Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 p-3 rounded-[6px] transition-colors ${
                          isActive ? "bg-surface border text-muted font-medium" : "text-muted hover:bg-surface"
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 text-subtle" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex-1 p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountShell;
