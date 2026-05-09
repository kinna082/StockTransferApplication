import { Link } from "react-router-dom";
import logoUrl from "../assets/CrazySilverShine_logo.jpg";

export default function AppHeader({ isAuthenticated, authState, onLogout }) {
  const homeTo =
    isAuthenticated && authState.role === "ADMIN"
      ? "/admin/transfers"
      : isAuthenticated && authState.role === "STORE_MANAGER"
        ? "/manager/transfers"
        : "/login";

  return (
    <header className="site-header">
      <div className="site-banner">
        <Link to={homeTo} className="site-brand">
          <img src={logoUrl} alt="CrazySilverShine" className="site-logo" />
          <span className="site-brand-title">Stock Transfer Application</span>
        </Link>
      </div>
      <nav className="app-nav" aria-label="Main navigation">
        {isAuthenticated ? (
          <>
            <div className="app-nav-links">
              {authState.role === "STORE_MANAGER" && (
                <>
                  <Link to="/manager/transfers/new">Create Transfer</Link>
                  <Link to="/manager/transfers">Manager Dashboard</Link>
                </>
              )}
              {authState.role === "ADMIN" && (
                <>
                  <Link to="/admin/transfers">Admin Dashboard</Link>
                  <Link to="/admin/users">Users</Link>
                  <Link to="/admin/products">Products</Link>
                </>
              )}
            </div>
            <div className="app-nav-user-row">
              <span className="app-nav-user">{authState.name}</span>
              <Link to="/change-password">Change password</Link>
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="app-nav-links">
            <Link to="/login">Login</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
