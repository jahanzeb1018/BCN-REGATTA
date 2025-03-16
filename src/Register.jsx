import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css"; // Reusing the same styles as Login

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      // Send a POST request to the register endpoint
      const response = await fetch("https:server-production-c33c.up.railway.app/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        // Redirect to the login page after successful registration
        navigate("/login");
      } else {
        // Handle registration errors
        const data = await response.json();
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during registration. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="auth-form-container">
        <h2>🌟 Sign Up</h2>
        <form onSubmit={handleRegister} className="login-form">
          <input
            type="text"
            placeholder="👤 Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="📧 Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="🔒 Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Sign Up</button>
        </form>
        <p className="register-link">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;