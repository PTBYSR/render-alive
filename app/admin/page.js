"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function timeAgo(timestamp) {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(seconds / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(timestamp) {
  if (!timestamp) return "—";
  const diff = Math.floor((Number(timestamp) - Date.now()) / 1000);
  if (diff <= 0) return "now";
  if (diff < 60) return `${diff}s`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function formatInterval(seconds) {
  const s = Number(seconds);
  if (!s) return "14 min";
  return `${Math.round(s / 60)} min`;
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

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openPreviews, setOpenPreviews] = useState({});

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
        if (json.users && json.users.length > 0 && !selectedUserId) {
          setSelectedUserId(json.users[0].userId);
        }
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
        const errJson = await res.json().catch(() => ({}));
        setLoginError(errJson.error || "Invalid admin key");
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

  const togglePreview = (serviceId) => {
    setOpenPreviews((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  if (authState === "loading") {
    return (
      <main className="admin-container">
        <div className="loading" style={{ textAlign: "center", padding: "60px 0" }}>Verifying credentials…</div>
      </main>
    );
  }

  if (authState === "unauthorized") {
    return (
      <main className="admin-container" style={{ maxWidth: "420px", margin: "80px auto", padding: "0 20px" }}>
        <div className="login-card" style={{ border: "1px solid var(--border)", padding: "32px", background: "var(--white)" }}>
          <div className="admin-header__title-group" style={{ marginBottom: "16px" }}>
            <h1 className="header__title" style={{ margin: 0, fontSize: "18px" }}>Render Alive</h1>
            <span className="admin-header__badge">Admin</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Sign in with the admin key to access created accounts and Render service telemetry.
          </p>

          <form onSubmit={handleLogin}>
            {loginError && <div className="message message--error" style={{ marginBottom: "14px", fontSize: "12px", color: "#e11d48" }}>{loginError}</div>}
            <div className="form__group" style={{ marginBottom: "16px" }}>
              <label className="form__label" htmlFor="admin-key" style={{ fontSize: "11px", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Admin Password</label>
              <input
                id="admin-key"
                type="password"
                className="form__input"
                placeholder="Enter password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={submittingKey}
                autoFocus
                required
                style={{ width: "100%", padding: "8px 10px", fontSize: "13px", border: "1px solid var(--border)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link href="/" className="btn--text" style={{ fontSize: "12px" }}>← Home</Link>
              <button type="submit" className="btn" disabled={submittingKey} style={{ padding: "8px 16px", fontSize: "12px" }}>
                {submittingKey ? "Unlocking…" : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  const filteredUsers = data.users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.userId.toLowerCase().includes(q) || u.urls.some((url) => url.toLowerCase().includes(q));
  });

  const selectedUser = data.users.find((u) => u.userId === selectedUserId) || filteredUsers[0];

  return (
    <main className="admin-container" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
      <header className="admin-header" style={{ marginBottom: "28px" }}>
        <div className="admin-header__title-group">
          <h1 className="header__title" style={{ margin: 0, fontSize: "20px" }}>Render Alive</h1>
          <span className="admin-header__badge">Admin</span>
        </div>
        <nav className="admin-header__nav">
          <Link href="/">← Public App</Link>
          <button type="button" className="btn--text" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      {/* Top Telemetry Metrics */}
      <section className="admin-metrics" style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <div className="metric-card" style={{ border: "1px solid var(--border)", padding: "16px 20px" }}>
          <div className="metric-card__label" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "4px" }}>Total Accounts</div>
          <div className="metric-card__value" style={{ fontSize: "24px", fontWeight: "600", fontFamily: "var(--mono)" }}>{data.totalUsers}</div>
        </div>
        <div className="metric-card" style={{ border: "1px solid var(--border)", padding: "16px 20px" }}>
          <div className="metric-card__label" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "4px" }}>Monitored Render Services</div>
          <div className="metric-card__value" style={{ fontSize: "24px", fontWeight: "600", fontFamily: "var(--mono)" }}>{data.totalServices}</div>
        </div>
        <div className="metric-card" style={{ border: "1px solid var(--border)", padding: "16px 20px" }}>
          <div className="metric-card__label" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "4px" }}>Active / Paused</div>
          <div className="metric-card__value" style={{ fontSize: "24px", fontWeight: "600", fontFamily: "var(--mono)" }}>
            {data.activeServices} <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>/ {data.totalServices - data.activeServices}</span>
          </div>
        </div>
      </section>

      {/* Main Split Layout: Item List + Details */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Column: Item List of Created Accounts */}
        <div style={{ border: "1px solid var(--border)", background: "var(--white)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
                Accounts List ({data.totalUsers})
              </span>
              <button type="button" className="btn--text" onClick={loadUsers} disabled={loadingData} style={{ fontSize: "11px" }}>
                {loadingData ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <input
              type="text"
              placeholder="Filter accounts by ID or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                No accounts found.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUser && selectedUser.userId === user.userId;
                return (
                  <div
                    key={user.userId}
                    onClick={() => setSelectedUserId(user.userId)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      background: isSelected ? "var(--gray-50, #f9fafb)" : "transparent",
                      borderLeft: isSelected ? "3px solid var(--black)" : "3px solid transparent",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: isSelected ? "600" : "500", color: "var(--text)" }}>
                        {user.userId}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {user.activeCount} active
                      </span>
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      {user.serviceCount} / 3 slots used
                    </div>

                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      Active: {timeAgo(user.latestPingAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Account Details & Render Services with Stats/Metrics */}
        <div style={{ border: "1px solid var(--border)", padding: "24px", background: "var(--white)" }}>
          {!selectedUser ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Select an account from the item list to view details and Render services.
            </div>
          ) : (
            <div>
              {/* Account Detail Header */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Account Details</span>
                    <h2 style={{ fontSize: "16px", fontWeight: "600", fontFamily: "var(--mono)", margin: "2px 0 0" }}>
                      {selectedUser.userId}
                    </h2>
                  </div>
                  <Link href={`/admin/users/${selectedUser.userId}`} className="btn--text" style={{ fontSize: "11px" }}>
                    Dedicated Page ↗
                  </Link>
                </div>

                <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Services: </span>
                    <strong style={{ fontFamily: "var(--mono)" }}>{selectedUser.serviceCount} / 3 slots</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Active: </span>
                    <strong style={{ fontFamily: "var(--mono)" }}>{selectedUser.activeCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Paused: </span>
                    <strong style={{ fontFamily: "var(--mono)" }}>{selectedUser.pausedCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Last Ping: </span>
                    <span>{timeAgo(selectedUser.latestPingAt)}</span>
                  </div>
                </div>
              </div>

              {/* Render Services List & Telemetry Metrics */}
              <div>
                <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: "14px" }}>
                  Render Services Added ({selectedUser.services?.length || 0})
                </h3>

                {(!selectedUser.services || selectedUser.services.length === 0) ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px", border: "1px dashed var(--border)" }}>
                    No Render services added by this account yet.
                  </div>
                ) : (
                  selectedUser.services.map((service) => {
                    const isActive = service.active === true || service.active === "true";
                    const isHtml = service.isHtml === true || service.isHtml === "true";
                    const canIframe = service.canIframe === true || service.canIframe === "true";
                    const hasPinged = !!service.lastPingAt;
                    const isPreviewOpen = !!openPreviews[service.id];

                    let dotClass = "status__dot--pending";
                    let label = "pending";
                    if (!isActive) {
                      dotClass = "status__dot--paused";
                      label = "paused";
                    } else if (hasPinged) {
                      dotClass = "status__dot--active";
                      label = "active";
                    }

                    return (
                      <div
                        key={service.id}
                        style={{
                          border: "1px solid var(--border)",
                          padding: "16px 18px",
                          marginBottom: "12px",
                          background: "var(--white)",
                        }}
                      >
                        {/* Service Title Bar */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontWeight: "600", fontSize: "13px", color: "var(--text)", textDecoration: "none" }}
                            >
                              {service.url} ↗
                            </a>
                            <span style={{ fontSize: "10px", padding: "1px 5px", border: "1px solid var(--border)", fontFamily: "var(--mono)" }}>
                              {isHtml ? "Web" : "API"}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-muted)" }}>
                            ID: {service.id}
                          </span>
                        </div>

                        {/* Telemetry Metrics Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", padding: "10px 12px", background: "var(--gray-50, #f9fafb)", border: "1px solid var(--border)", fontSize: "11px" }}>
                          <div>
                            <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "9px", marginBottom: "2px" }}>Status</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span className={`status__dot ${dotClass}`} />
                              <strong style={{ textTransform: "capitalize" }}>{label}</strong>
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "9px", marginBottom: "2px" }}>Latency & HTTP</div>
                            <div>
                              {service.lastStatus ? (
                                <span style={{ fontWeight: "600", color: service.lastStatus === "200" ? "#10b981" : "#f59e0b" }}>
                                  {service.lastStatus} OK
                                </span>
                              ) : "—"}
                              {service.lastLatency && (
                                <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                                  ({service.lastLatency}ms)
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "9px", marginBottom: "2px" }}>Interval</div>
                            <div>
                              <strong>{formatInterval(service.interval)}</strong>
                            </div>
                          </div>

                          <div>
                            <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: "9px", marginBottom: "2px" }}>Next Ping</div>
                            <div>
                              {isActive ? timeUntil(service.nextPingAt) : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Live Site Preview Toggle */}
                        {canIframe && (
                          <div style={{ marginTop: "10px" }}>
                            <button
                              type="button"
                              className="btn--text"
                              onClick={() => togglePreview(service.id)}
                              style={{ fontSize: "11px" }}
                            >
                              {isPreviewOpen ? "▲ Hide Live Preview" : "▼ Show Live Preview"}
                            </button>

                            {isPreviewOpen && (
                              <div style={{ marginTop: "8px", border: "1px solid var(--border)" }}>
                                <iframe
                                  src={service.url}
                                  title={`Preview of ${service.url}`}
                                  sandbox="allow-scripts allow-same-origin allow-forms"
                                  loading="lazy"
                                  style={{ width: "100%", height: "260px", border: "none" }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
