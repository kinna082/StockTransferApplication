import { Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import TransferDetailsPage from "./pages/admin/TransferDetailsPage";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage";
import CreateTransferPage from "./pages/manager/CreateTransferPage";
import LoginPage from "./pages/auth/LoginPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";
import { logout as apiLogout, clearSession } from "./services/api";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooter";

export default function App() {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem("accessToken") || "",
    role: localStorage.getItem("userRole") || "",
    name: localStorage.getItem("userName") || "",
    branchId: localStorage.getItem("userBranchId") || "",
    userId: localStorage.getItem("userId") || ""
  });

  const isAuthenticated = useMemo(() => Boolean(authState.token), [authState.token]);

  const logout = async () => {
    await apiLogout();
    clearSession();
    setAuthState({ token: "", role: "", name: "", branchId: "", userId: "" });
  };

  return (
    <div className="app-shell">
      <AppHeader isAuthenticated={isAuthenticated} authState={authState} onLogout={logout} />

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
          <Route
            path="/login"
            element={
              <LoginPage
                onLogin={(result) =>
                  setAuthState({
                    token: result.accessToken,
                    role: result.role,
                    name: result.name,
                    branchId: result.branchId ?? "",
                    userId: result.userId != null ? String(result.userId) : ""
                  })
                }
              />
            }
          />
          <Route
            path="/change-password"
            element={
              isAuthenticated ? (
                <ChangePasswordPage
                  onPasswordChanged={(auth) =>
                    setAuthState({
                      token: auth.accessToken,
                      role: auth.role,
                      name: auth.name,
                      branchId: auth.branchId ?? "",
                      userId: auth.userId != null ? String(auth.userId) : ""
                    })
                  }
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/manager/transfers/new"
            element={isAuthenticated && authState.role === "STORE_MANAGER" ? <CreateTransferPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/manager/transfers"
            element={isAuthenticated && authState.role === "STORE_MANAGER" ? <ManagerDashboardPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/manager/transfers/:id/details"
            element={
              isAuthenticated && authState.role === "STORE_MANAGER" ? (
                <TransferDetailsPage readOnly />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/transfers"
            element={isAuthenticated && authState.role === "ADMIN" ? <AdminDashboardPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/users"
            element={
              isAuthenticated && authState.role === "ADMIN" ? (
                <AdminUsersPage currentUserId={authState.userId ? Number(authState.userId) : null} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/products"
            element={isAuthenticated && authState.role === "ADMIN" ? <AdminProductsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/transfers/:id/details"
            element={isAuthenticated && authState.role === "ADMIN" ? <TransferDetailsPage /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </main>

      <AppFooter />
    </div>
  );
}
