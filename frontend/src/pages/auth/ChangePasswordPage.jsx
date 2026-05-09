import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../services/api";

export default function ChangePasswordPage({ onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    try {
      setIsSubmitting(true);
      const auth = await changePassword({ currentPassword, newPassword });
      onPasswordChanged?.(auth);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (error) {
      const text = error.message || "Failed to change password.";
      setMessage(text.replace(/^"|"$/g, ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h2>Change password</h2>
      <p>Use a strong password at least 8 characters long.</p>
      <form onSubmit={handleSubmit} className="grid-form grid-form--two-cols">
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <div className="form-row-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Update password"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
