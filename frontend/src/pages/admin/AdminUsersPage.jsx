import { useEffect, useState } from "react";
import { createUser, deleteUser, getBranches, getUsers, updateUser } from "../../services/api";

export default function AdminUsersPage({ currentUserId }) {
  const [branchMap, setBranchMap] = useState({});
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    roleName: "STORE_MANAGER",
    branchId: ""
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState({
    fullName: "",
    email: "",
    roleName: "STORE_MANAGER",
    branchId: "",
    newPassword: ""
  });

  const load = async () => {
    const errors = [];

    try {
      const branches = await getBranches();
      const map = {};
      for (const b of Array.isArray(branches) ? branches : []) {
        if (b != null && b.id != null) {
          map[b.id] = `${b.branchCode ?? ""} - ${b.branchName ?? ""}`;
        }
      }
      setBranchMap(map);
    } catch {
      errors.push("Could not load branches.");
      setBranchMap({});
    }

    try {
      const userData = await getUsers();
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (e) {
      errors.push(e.message?.replace(/^"|"$/g, "") || "Could not load users.");
      setUsers([]);
    }

    if (errors.length > 0) {
      setMessage(errors.join(" "));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateUser = async () => {
    setMessage("");
    if (!newUser.fullName || !newUser.email || !newUser.password || !newUser.roleName || !newUser.branchId) {
      setMessage("Please fill all user fields including branch.");
      return;
    }
    try {
      await createUser({ ...newUser, branchId: Number(newUser.branchId) });
      await load();
      setMessage("User created successfully.");
      setNewUser({ fullName: "", email: "", password: "", roleName: "STORE_MANAGER", branchId: "" });
    } catch (error) {
      setMessage(error.message?.replace(/^"|"$/g, "") || "Failed to create user.");
    }
  };

  const startEdit = (u) => {
    setEditingUserId(u.id);
    setEditingUser({
      fullName: u.fullName,
      email: u.email,
      roleName: u.roleName,
      branchId: u.branchId > 0 ? String(u.branchId) : "",
      newPassword: ""
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditingUser({
      fullName: "",
      email: "",
      roleName: "STORE_MANAGER",
      branchId: "",
      newPassword: ""
    });
  };

  const handleSaveUser = async (userId) => {
    setMessage("");
    if (!editingUser.fullName?.trim() || !editingUser.email?.trim() || !editingUser.roleName) {
      setMessage("Please fill name, email, and role.");
      return;
    }
    if (editingUser.roleName === "STORE_MANAGER" && !editingUser.branchId) {
      setMessage("Store managers must have a branch assigned.");
      return;
    }
    try {
      const payload = {
        fullName: editingUser.fullName.trim(),
        email: editingUser.email.trim(),
        roleName: editingUser.roleName,
        branchId: editingUser.roleName === "ADMIN" && !editingUser.branchId ? 0 : Number(editingUser.branchId),
        newPassword: editingUser.newPassword?.trim() || undefined
      };
      await updateUser(userId, payload);
      await load();
      setMessage("User updated successfully.");
      cancelEdit();
    } catch (error) {
      setMessage(error.message?.replace(/^"|"$/g, "") || "Failed to update user.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    setMessage("");
    try {
      await deleteUser(userId);
      await load();
      setMessage("User deleted successfully.");
    } catch (error) {
      setMessage(error.message?.replace(/^"|"$/g, "") || "Failed to delete user.");
    }
  };

  const branchSelectOptions = Object.entries(branchMap).map(([id, name]) => (
    <option key={id} value={id}>
      {name}
    </option>
  ));

  return (
    <section>
      <h2>User Management</h2>
      <p>Create users and assign branch access.</p>

      <h3>Create User</h3>
      <div className="grid-form grid-form--two-cols">
        <label>
          Full Name
          <input value={newUser.fullName} onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))} />
        </label>
        <label>
          Email
          <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <label>
          Password
          <input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
        </label>
        <label>
          Role
          <select value={newUser.roleName} onChange={(e) => setNewUser((p) => ({ ...p, roleName: e.target.value }))}>
            <option value="STORE_MANAGER">STORE_MANAGER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label>
          Branch
          <select value={newUser.branchId} onChange={(e) => setNewUser((p) => ({ ...p, branchId: e.target.value }))}>
            <option value="">Select branch</option>
            {branchSelectOptions}
          </select>
        </label>
        <button type="button" onClick={handleCreateUser}>
          Create User
        </button>
      </div>

      <h3>Users</h3>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {editingUserId === u.id ? (
                    <input
                      value={editingUser.fullName}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                  ) : (
                    u.fullName
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    u.email
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <select
                      value={editingUser.roleName}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, roleName: e.target.value }))}
                    >
                      <option value="STORE_MANAGER">STORE_MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : (
                    u.roleName
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <select
                      value={editingUser.branchId}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, branchId: e.target.value }))}
                    >
                      <option value="">{editingUser.roleName === "ADMIN" ? "No branch" : "Select branch"}</option>
                      {branchSelectOptions}
                    </select>
                  ) : (
                    u.branchName || (u.branchId > 0 ? `ID ${u.branchId}` : "—")
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <div className="user-edit-actions">
                      <label className="user-new-password-label">
                        New password (optional)
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Min 8 characters"
                          value={editingUser.newPassword}
                          onChange={(e) => setEditingUser((prev) => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </label>
                      <div className="actions">
                        <button type="button" onClick={() => handleSaveUser(u.id)}>
                          Save
                        </button>
                        <button type="button" className="btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="actions">
                      <button type="button" onClick={() => startEdit(u)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={currentUserId != null && u.id === currentUserId}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
