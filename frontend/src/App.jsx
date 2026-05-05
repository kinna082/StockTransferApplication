import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage";
import CreateTransferPage from "./pages/manager/CreateTransferPage";
import LoginPage from "./pages/auth/LoginPage";
import { logout as apiLogout, clearSession } from "./services/api";

export default function App() {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem("accessToken") || "",
    role: localStorage.getItem("userRole") || "",
    name: localStorage.getItem("userName") || ""
  });

  const isAuthenticated = useMemo(() => Boolean(authState.token), [authState.token]);

  const logout = async () => {
    await apiLogout();
    clearSession();
    setAuthState({ token: "", role: "", name: "" });
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Stock Transfer Application</h1>
        <nav>
          {isAuthenticated ? (
            <>
              {authState.role === "STORE_MANAGER" && (
                <>
                  <Link to="/manager/transfers/new">Create Transfer</Link>
                  <Link to="/manager/transfers">Manager Dashboard</Link>
                </>
              )}
              {authState.role === "ADMIN" && <Link to="/admin/transfers">Admin Dashboard</Link>}
              <span>{authState.name}</span>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? (authState.role === "ADMIN" ? "/admin/transfers" : "/manager/transfers") : "/login"}
                replace
              />
            }
          />
          <Route path="/login" element={<LoginPage onLogin={(result) => setAuthState({ token: result.accessToken, role: result.role, name: result.name })} />} />
          <Route
            path="/manager/transfers/new"
            element={isAuthenticated && authState.role === "STORE_MANAGER" ? <CreateTransferPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/manager/transfers"
            element={isAuthenticated && authState.role === "STORE_MANAGER" ? <ManagerDashboardPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/transfers"
            element={isAuthenticated && authState.role === "ADMIN" ? <AdminDashboardPage /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}
