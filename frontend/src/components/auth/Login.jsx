// src/components/auth/Login.jsx
import React, { useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Header from "../layout/Header";
import ParticleBackground from "../layout/ParticleBackground";
import styles from "../../styles/Login.module.css";

const Login = () => {
  const { loginUser } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      try {
        // If your login accepts username OR email, consider renaming variable to "identifier"
        await loginUser(identifier, password);
        navigate("/dashboard");
      } catch (err) {
        setError(err.message || "Login failed. Please try again.");
      }
    },
    [identifier, password, loginUser, navigate]
  );

  return (
    <>
      <Header />
      <ParticleBackground />
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h2 className={styles.loginTitle}>Login</h2>
          {error && (
            <p className={`${styles.loginError} ${styles.show}`}>
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <input
              className={styles.loginInput}
              type="text"
              placeholder="Username or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <input
              className={styles.loginInput}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className={styles.loginButton} type="submit">
              Login
            </button>
          </form>
          <p className={styles.signupRedirect}>
            Don't have an account?
            <button
              className={styles.signupRedirectButton}
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </>
  );
};

export default React.memo(Login);
