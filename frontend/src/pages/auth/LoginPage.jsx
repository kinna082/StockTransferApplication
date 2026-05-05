import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      setIsLoading(true);
      const result = await login({ email, password });
      onLogin(result);
      navigate(result.role === "ADMIN" ? "/admin/transfers" : "/manager/transfers");
    } catch {
      setMessage("Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="grid-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Login"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
