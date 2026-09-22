"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function timeAgo(timestamp) {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminPage() {
  const [authState, setAuthState] = useState("loading"); // loading, unauthorized, authorized
  const [keyInput, setKeyInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submittingKey, setSubmittingKey] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState({
    totalUsers: 0,
    totalServices: 0,
    activeServices: 0,
    users: [],
  });

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      const json = await res.json();
      if (json.authenticated) {
        setAuthState("authorized");
        loadUsers();
      } else {
        setAuthState("unauthorized");
      }
    } catch {
      setAuthState("unauthorized");
    }
  };

  const loadUsers = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401) {
        setAuthState("unauthorized");
      }
    } catch (err) {
      console.error("Failed to load admin users:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setSubmittingKey(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: trimmed }),
      });
      if (res.ok) {
        setAuthState("authorized");
        setKeyInput("");
        loadUsers();
      } else {
        setLoginError("Invalid admin key");
      }
    } catch {
      setLoginError("Network error");
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthState("unauthorized");
  };

  if (authState === "loading") {
    return (
      <main className="admin-container">
        <div className="loading">Verifying credentials…</div>
      </main>
    );
  }

  if (authState === "unauthorized") {
    return (
      <main className="admin-container">
        <div className="login-card">
          <div className="admin-header__title-group" style={{ marginBottom: "16px" }}>
            <h1 className="header__title" style={{ margin: 0 }}>Render Alive</h1>
            <span className="admin-header__badge">Admin</span>
          </div>
          <p className="header__description" style={{ marginBottom: "24px" }}>
            Enter your secret key to access user data and system telemetry.
          </p>

          <form onSubmit={handleLogin}>
            {loginError && <div className="message message--error">{loginError}</div>}
            <div className="form__group">
              <label className="form__label" htmlFor="admin-key">Admin Secret Key</label>
              <input
                id="admin-key"
                type="password"
                className="form__input"
                placeholder="••••••••••••"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={submittingKey}
                required
              />
            </div>
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link href="/" className="btn--text">← Return Home</Link>
              <button type="submit" className="btn" disabled={submittingKey}>
                {submittingKey ? "Checking…" : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-container">
      <header className="admin-header">
        <div className="admin-header__title-group">
          <h1 className="header__title" style={{ margin: 0 }}>Render Alive</h1>
          <span className="admin-header__badge">Admin</span>
        </div>
        <nav className="admin-header__nav">
          <Link href="/">← Public App</Link>
          <button type="button" className="btn--text" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <section className="admin-metrics">
        <div className="metric-card">
          <div className="metric-card__label">Total Users</div>
          <div className="metric-card__value">{data.totalUsers}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Monitored Services</div>
          <div className="metric-card__value">{data.totalServices}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Active / Paused</div>
          <div className="metric-card__value">
            {data.activeServices} <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>/ {data.totalServices - data.activeServices}</span>
          </div>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="admin-section__title" style={{ margin: 0 }}>Users Directory</h2>
          <button type="button" className="btn--text" onClick={loadUsers} disabled={loadingData}>
            {loadingData ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loadingData && data.users.length === 0 ? (
          <div className="loading">Loading users…</div>
        ) : data.users.length === 0 ? (
          <div className="services__empty">No users have registered services yet.</div>
        ) : (
          data.users.map((user) => (
            <Link
              key={user.userId}
              href={`/admin/users/${user.userId}`}
              className="user-row"
            >
              <div className="user-row__header">
                <span className="user-row__id">{user.userId}</span>
                <span className="user-row__count">
                  {user.serviceCount} / 3 slots • {user.activeCount} active
                </span>
              </div>

              <div className="user-row__urls">
                {user.urls.map((url, idx) => (
                  <div key={idx} className="user-row__url">
                    • {url}
                  </div>
                ))}
              </div>

              <div className="user-row__footer">
                <span>Last active: {timeAgo(user.latestPingAt)}</span>
                <span style={{ color: "var(--text)" }}>View User Data →</span>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
