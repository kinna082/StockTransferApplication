const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5080/api";

function getToken() {
  return localStorage.getItem("accessToken") || "";
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken") || "";
}

function setSession(auth) {
  localStorage.setItem("accessToken", auth.accessToken);
  localStorage.setItem("refreshToken", auth.refreshToken);
  localStorage.setItem("userRole", auth.role);
  localStorage.setItem("userName", auth.name);
  localStorage.setItem("userBranchId", auth.branchId ?? "");
  if (auth.userId != null) localStorage.setItem("userId", String(auth.userId));
}

export function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userBranchId");
  localStorage.removeItem("userId");
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) return false;

  const auth = await response.json();
  setSession(auth);
  return true;
}

async function request(path, options = {}, hasRetried = false) {
  const token = getToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader, ...(options.headers || {}) },
    ...options
  });

  if (response.status === 401 && !hasRetried && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, options, true);
    }
    clearSession();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((auth) => {
    setSession(auth);
    return auth;
  });
}

export function logout() {
  const refreshToken = getRefreshToken();
  return request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  }).finally(() => {
    clearSession();
  });
}

export function changePassword(payload) {
  return request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword
    })
  }).then((auth) => {
    if (auth) setSession(auth);
    return auth;
  });
}

export function getBranches() {
  return request("/branches");
}

export function getProducts() {
  return request("/products");
}

export function getProductsPaged({ page = 1, pageSize = 10, search = "", sortBy = "productName", sortDirection = "asc" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDirection
  });
  if (search) params.set("search", search);
  return request(`/products/paged?${params.toString()}`);
}

export function createProduct(payload) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProduct(productId, payload) {
  return request(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteProduct(productId) {
  return request(`/products/${productId}`, {
    method: "DELETE"
  });
}

export function getStatuses() {
  return request("/statuses");
}

export function getUsers() {
  return request("/users");
}

export function createUser(payload) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateUser(userId, payload) {
  const body = {
    fullName: payload.fullName,
    email: payload.email,
    roleName: payload.roleName,
    branchId: Number(payload.branchId) || 0
  };
  if (payload.newPassword && String(payload.newPassword).trim()) {
    body.newPassword = String(payload.newPassword).trim();
  }
  return request(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function deleteUser(userId) {
  return request(`/users/${userId}`, {
    method: "DELETE"
  });
}

export function getTransfers({ page = 1, pageSize = 10, status = "" } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set("status", status);
  return request(`/transfers?${params.toString()}`);
}

export function createTransfer(payload) {
  return request("/transfers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTransferStatus(transferId, status) {
  return request(`/transfers/${transferId}/status?status=${status}`, {
    method: "PATCH"
  });
}

export function getTransferDetails(transferId) {
  return request(`/transfers/${transferId}/details`);
}

export async function downloadTransferExcel(transferId) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    throw new Error("Failed to download transfer export.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transfer-${transferId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
