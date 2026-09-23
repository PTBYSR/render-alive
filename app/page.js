"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const INTERVAL_OPTIONS = [
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: 840, label: "14 min" },
  { value: 1200, label: "20 min" },
  { value: 1800, label: "30 min" },
];

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(timestamp) {
  if (!timestamp) return "—";
  const seconds = Math.floor((Number(timestamp) - Date.now()) / 1000);
  if (seconds <= 0) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function HttpCode({ status }) {
  if (!status) return <span className="http-code">—</span>;
  const code = Number(status);
  if (code === 0) return <span className="http-code http-code--error">err</span>;
  if (code >= 200 && code < 400)
    return <span className="http-code http-code--ok">{code}</span>;
  return <span className="http-code http-code--error">{code}</span>;
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [url, setUrl] = useState("");
  const [interval, setInterval_] = useState(840);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const [showSignInTooltip, setShowSignInTooltip] = useState(false);
  const [highlightSignIn, setHighlightSignIn] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setShowSignInTooltip(false);
      setHighlightSignIn(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSignInTooltip(true);
      setHighlightSignIn(true);

      const highlightTimer = setTimeout(() => {
        setHighlightSignIn(false);
      }, 2500);

      const tooltipTimer = setTimeout(() => {
        setShowSignInTooltip(false);
      }, 7000);

      return () => {
        clearTimeout(highlightTimer);
        clearTimeout(tooltipTimer);
      };
    }, 450);

    return () => clearTimeout(timer);
  }, [session]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/urls");
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const id = window.setInterval(fetchServices, 30000);
    return () => window.clearInterval(id);
  }, [fetchServices, session]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSubmittingAuth(true);
    try {
      const res = await signIn("credentials", {
        email: authEmail,
        password: authPassword,
        redirect: false,
      });
      if (res?.error) {
        setAuthError("Invalid credentials or error signing in.");
      } else {
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
        fetchServices();
      }
    } catch {
      setAuthError("An error occurred during authentication.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleAuth = () => {
    signIn("google");
  };

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = url.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, interval }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add");
        return;
      }
      setSuccess("Added");
      setUrl("");
      await fetchServices();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const [deletingService, setDeletingService] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pendingIntervalChange, setPendingIntervalChange] = useState(null);
  const [isUpdatingInterval, setIsUpdatingInterval] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (deletingService && !isDeleting) setDeletingService(null);
        if (pendingIntervalChange && !isUpdatingInterval) setPendingIntervalChange(null);
        if (showAuthModal && !submittingAuth) setShowAuthModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletingService, isDeleting, pendingIntervalChange, isUpdatingInterval, showAuthModal, submittingAuth]);

  const confirmDelete = async () => {
    if (!deletingService) return;
    setIsDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/urls?id=${deletingService.id}`, { method: "DELETE" });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
        setSuccess("Service removed.");
        setDeletingService(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to remove service");
      }
    } catch {
      setError("Network error while removing service");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (serviceId, currentActive) => {
    try {
      const nextState = !(currentActive === true || currentActive === "true");
      const res = await fetch("/api/urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: serviceId, active: nextState }),
      });
      if (res.ok) {
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
    } catch {
      setError("Failed to update");
    }
  };

  const handleIntervalChangeRequest = (service, newInterval) => {
    if (Number(service.interval) === Number(newInterval)) return;
    const getLabel = (sec) => {
      const opt = INTERVAL_OPTIONS.find((o) => o.value === Number(sec));
      return opt ? opt.label : `${Math.round(Number(sec) / 60)} min`;
    };

    setPendingIntervalChange({
      service,
      newInterval: Number(newInterval),
      oldLabel: getLabel(service.interval),
      newLabel: getLabel(newInterval),
    });
  };

  const confirmIntervalChange = async () => {
    if (!pendingIntervalChange) return;
    const { service, newInterval, newLabel } = pendingIntervalChange;
    setIsUpdatingInterval(true);
    setError("");
    try {
      const res = await fetch("/api/urls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, interval: newInterval }),
      });
      if (res.ok) {
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSuccess(`Ping interval updated to ${newLabel}.`);
        setPendingIntervalChange(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update interval");
      }
    } catch {
      setError("Network error while updating interval");
    } finally {
      setIsUpdatingInterval(false);
    }
  };

  const isFull = services.length >= 3;

  return (
    <main className="container">
      {/* Top Minimal Navigation */}
      <nav className="top-nav">
        <div className="top-nav__brand">
          <span className="top-nav__logo">Render Alive</span>
          <span className="top-nav__status">
            <span className="top-nav__status-dot" />
            LIVE
          </span>
        </div>

        <div className="top-nav__links">
          {!session?.user && (
            <a href="#console" className="top-nav__link">
              Console
            </a>
          )}
          <a
            href="https://github.com/PTBYSR/render-alive"
            target="_blank"
            rel="noopener noreferrer"
            className="top-nav__link"
            title="Star on GitHub"
          >
            <span>GitHub</span>
            <span style={{ fontSize: "10px", opacity: 0.6 }}>↗</span>
          </a>
          <a
            href="https://x.com/ptbthefirst"
            target="_blank"
            rel="noopener noreferrer"
            className="top-nav__link"
            title="Follow Creator on X"
          >
            <span>@ptbthefirst</span>
            <span style={{ fontSize: "10px", opacity: 0.6 }}>↗</span>
          </a>
          <a href="/admin" className="top-nav__link">
            Admin
          </a>
          <div className="auth-nav">
            {session?.user ? (
              <div className="auth-nav__user">
                <span className="auth-nav__avatar" title={session.user.email}>
                  {session.user.image ? (
                    <img src={session.user.image} alt={session.user.name || "User"} />
                  ) : (
                    (session.user.name || session.user.email || "U")[0].toUpperCase()
                  )}
                </span>
                <span className="auth-nav__name" title={session.user.email}>
                  {session.user.name || session.user.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  className="btn--signout"
                  onClick={() => signOut()}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="auth-nav__prompt-container">
                <button
                  type="button"
                  className={`btn--text ${highlightSignIn ? "btn--signin-highlight" : ""}`}
                  onClick={() => {
                    setShowAuthModal(true);
                    setShowSignInTooltip(false);
                  }}
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                >
                  Sign In →
                </button>
                {showSignInTooltip && (
                  <div
                    className="signin-tooltip"
                    onClick={() => {
                      setShowAuthModal(true);
                      setShowSignInTooltip(false);
                    }}
                  >
                    <div className="signin-tooltip__arrow" />
                    <div className="signin-tooltip__content">
                      <span>Create an account to save your services</span>
                      <button
                        type="button"
                        className="signin-tooltip__close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSignInTooltip(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Guest: Landing Page Hero | Authenticated: Session Service Panel Header */}
      {!session?.user ? (
        <section className="landing-hero">
          <div className="landing-hero__badge">// ZERO COLD STARTS • 24/7 UPTIME</div>
          <h1 className="landing-hero__title">
            Keep your free Render web services awake.
          </h1>
          <p className="landing-hero__subtitle">
            Automated, zero-latency edge pings powered by Upstash Redis and 24/7 keep-alive scheduling.
            Stop waiting 50+ seconds for inactive instances to spin up.
          </p>
          <div className="landing-hero__actions">
            <button
              type="button"
              className="btn"
              onClick={() => setShowAuthModal(true)}
              style={{ padding: "9px 18px", display: "inline-flex", alignItems: "center" }}
            >
              Start Monitoring →
            </button>
            <a
              href="https://github.com/PTBYSR/render-alive"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
              style={{
                padding: "9px 16px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>GitHub ⭐️</span>
              <span style={{ fontSize: "11px" }}>↗</span>
            </a>
            <a
              href="https://x.com/ptbthefirst"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
              style={{
                padding: "9px 16px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Follow @ptbthefirst</span>
              <span style={{ fontSize: "11px" }}>↗</span>
            </a>
          </div>
          <div className="landing-hero__metrics">
            <div className="landing-hero__metric">
              <span className="landing-hero__metric-value">0s</span>
              <span className="landing-hero__metric-label">Cold-start lag</span>
            </div>
            <div className="landing-hero__metric">
              <span className="landing-hero__metric-value">3</span>
              <span className="landing-hero__metric-label">Free monitor slots</span>
            </div>
            <div className="landing-hero__metric">
              <span className="landing-hero__metric-value">1-Min</span>
              <span className="landing-hero__metric-label">Cron resolution</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel-header">
          <div className="panel-header__eyebrow">// SESSION ACTIVE • SERVICE PANEL</div>
          <h1 className="panel-header__title">Monitored Web Services</h1>
          <p className="panel-header__subtitle">
            Your keep-alive ping daemon is active. Manage up to 3 Render services below.
          </p>
        </section>
      )}

      {/* Service Monitoring Console (Authenticated) or Auth Gate (Guest) */}
      <div id="console" className="console-section">
        {session?.user ? (
          <>
            <div className="console-header">
              <h2 className="console-header__title">Active Service Monitor</h2>
              <span className="console-header__slots">
                {services.length} / 3 slots used
              </span>
            </div>

            <form className="form" onSubmit={handleAdd} id="add-service-form">
              {error && <div className="message message--error">{error}</div>}
              {success && <div className="message message--success">{success}</div>}

              <div className="form__row">
                <div className="form__group">
                  <label className="form__label" htmlFor="url-input">URL</label>
                  <input
                    id="url-input"
                    className="form__input"
                    type="url"
                    placeholder="https://your-app.onrender.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={submitting || isFull}
                    required
                  />
                </div>
                <div className="form__group">
                  <label className="form__label" htmlFor="interval-select">Interval</label>
                  <select
                    id="interval-select"
                    className="form__select"
                    value={interval}
                    onChange={(e) => setInterval_(Number(e.target.value))}
                    disabled={submitting || isFull}
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form__bottom">
                <span className={`form__counter ${isFull ? "form__counter--full" : ""}`}>
                  {services.length} / 3
                </span>
                <button
                  id="add-service-btn"
                  className="btn"
                  type="submit"
                  disabled={submitting || isFull || !url.trim()}
                >
                  {submitting ? "Verifying…" : "Add"}
                </button>
              </div>
            </form>

            <section className="services">
              <div className="services__label">Services</div>

              {loading ? (
                <div className="loading">Loading…</div>
              ) : services.length === 0 ? (
                <div className="services__empty">No services monitored yet. Add a URL above.</div>
              ) : (
                services.map((service) => (
                  <ServiceItem
                    key={service.id}
                    service={service}
                    onToggle={handleToggle}
                    onDelete={(svc) => setDeletingService(svc)}
                    onIntervalChange={handleIntervalChangeRequest}
                    onUpdate={(updated) =>
                      setServices((prev) =>
                        prev.map((s) => (s.id === updated.id ? updated : s))
                      )
                    }
                  />
                ))
              )}
            </section>
          </>
        ) : (
          <div className="auth-gate">
            <div className="auth-gate__badge">// ACCOUNT REQUIRED</div>
            <h3 className="auth-gate__title">Sign In to Monitor Your Render Services</h3>
            <p className="auth-gate__description">
              Free Render web services spin down after 15 minutes of inactivity. Create an account to unlock 3 keep-alive slots, set customized ping intervals, and keep your applications responsive 24/7.
            </p>
            <div className="auth-gate__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In / Create Account →
              </button>
            </div>
            <div className="auth-gate__features">
              <div className="auth-gate__feature">✓ 3 Free Monitored Web Services</div>
              <div className="auth-gate__feature">✓ Automated 24/7 Edge Pings</div>
              <div className="auth-gate__feature">✓ Real-Time Latency & Health Checks</div>
            </div>
          </div>
        )}
      </div>

      {deletingService && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeletingService(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal">
            <h2 id="modal-title" className="modal__title">
              Remove Service
            </h2>
            <p className="modal__description">
              Are you sure you want to stop monitoring this URL? This action will
              permanently remove it from the keep-alive schedule.
            </p>
            <div className="modal__url">{deletingService.url}</div>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setDeletingService(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger-solid"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing…" : "Remove Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingIntervalChange && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdatingInterval) {
              setPendingIntervalChange(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-interval-title"
        >
          <div className="modal">
            <h2 id="modal-interval-title" className="modal__title">
              Change Ping Interval
            </h2>
            <p className="modal__description">
              Adjust how frequently this service is pinged to prevent idle spin-down.
            </p>
            <div className="modal__url">{pendingIntervalChange.service.url}</div>

            <div className="modal__diff">
              <span className="modal__diff-item">
                <span className="modal__diff-label">Current:</span>
                <span className="modal__diff-value">{pendingIntervalChange.oldLabel}</span>
              </span>
              <span className="modal__diff-arrow">→</span>
              <span className="modal__diff-item">
                <span className="modal__diff-label">New:</span>
                <span className="modal__diff-value">{pendingIntervalChange.newLabel}</span>
              </span>
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPendingIntervalChange(null)}
                disabled={isUpdatingInterval}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger-solid"
                onClick={confirmIntervalChange}
                disabled={isUpdatingInterval}
              >
                {isUpdatingInterval ? "Updating…" : "Update Interval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingAuth) {
              setShowAuthModal(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="modal" style={{ maxWidth: "380px" }}>
            <h2 id="auth-modal-title" className="modal__title" style={{ marginBottom: "6px" }}>
              Sign In to Render Alive
            </h2>
            <p className="modal__description" style={{ marginBottom: "20px" }}>
              Save and sync your monitored services across devices.
            </p>

            {authError && <div className="message message--error">{authError}</div>}

            <button
              type="button"
              className="btn--google"
              onClick={handleGoogleAuth}
              disabled={submittingAuth}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="auth-divider">
              <span>or email</span>
            </div>

            <form onSubmit={handleEmailAuth}>
              <div className="form__group" style={{ marginBottom: "14px" }}>
                <label className="form__label" htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="form__input"
                  placeholder="developer@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  disabled={submittingAuth}
                  required
                />
              </div>

              <div className="form__group" style={{ marginBottom: "20px" }}>
                <label className="form__label" htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="form__input"
                  placeholder="••••••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  disabled={submittingAuth}
                  required
                />
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowAuthModal(false)}
                  disabled={submittingAuth}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submittingAuth || !authEmail || !authPassword}
                >
                  {submittingAuth ? "Signing in…" : "Sign In / Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="footer">
        <span className="footer__text">
          Render Alive • 24/7 Keep-Alive Daemon •{" "}
          <a
            href="https://github.com/PTBYSR/render-alive"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__author-link"
          >
            GitHub
          </a>
        </span>
        <span className="footer__text">
          Built by{" "}
          <a
            href="https://x.com/ptbthefirst"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__author-link"
          >
            @ptbthefirst
          </a>
        </span>
      </footer>
    </main>
  );
}

function ServiceItem({
  service,
  onToggle,
  onDelete,
  onIntervalChange,
  onUpdate,
}) {
  const isActive = service.active === true || service.active === "true";
  const isWaking = service.lastStatus === "waking";
  const hasPinged = !!service.lastPingAt && !isWaking;
  const canIframe = service.canIframe === true || service.canIframe === "true";
  const isHtml = service.isHtml === true || service.isHtml === "true";

  const [elapsed, setElapsed] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isWaking) return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/urls?check=${service.id}`);
        if (res.ok) {
          const updated = await res.json();
          if (!updated.isWaking && updated.lastStatus !== "waking") {
            onUpdate(updated);
          }
        }
      } catch {
        // Continue polling
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [isWaking, service.id, onUpdate]);

  let statusDotClass = "status__dot--pending";
  let statusLabel = "pending";
  if (!isActive) {
    statusDotClass = "status__dot--paused";
    statusLabel = "paused";
  } else if (isWaking) {
    statusDotClass = "status__dot--spinning";
    statusLabel = `spinning up (${elapsed}s)`;
  } else if (hasPinged) {
    statusDotClass = "status__dot--active";
    statusLabel = "active";
  }

  return (
    <div
      className={`service ${!isActive ? "service--paused" : ""}`}
      id={`service-${service.id}`}
    >
      <div className="service__url">
        <a href={service.url} target="_blank" rel="noopener noreferrer">
          {service.url}
        </a>
        {isHtml ? (
          <span className="service__badge">Web</span>
        ) : (
          <span className="service__badge">API</span>
        )}
      </div>

      <div className="service__meta">
        <div className="service__meta-item">
          <span className="service__meta-label">Status</span>
          <span className="service__meta-value">
            <span className={`status__dot ${statusDotClass}`} />
            {statusLabel}
          </span>
        </div>
        <div className="service__meta-item">
          <span className="service__meta-label">Last ping</span>
          <span className="service__meta-value">
            {isWaking ? (
              "Waiting for response…"
            ) : (
              <>
                {timeAgo(service.lastPingAt)}
                {service.lastStatus && (
                  <>
                    {" "}
                    <HttpCode status={service.lastStatus} />
                  </>
                )}
                {service.lastLatency && Number(service.lastLatency) > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {" "}({service.lastLatency}ms)
                  </span>
                )}
              </>
            )}
          </span>
        </div>
        <div className="service__meta-item">
          <span className="service__meta-label">Next</span>
          <span className="service__meta-value">
            {isActive ? timeUntil(service.nextPingAt) : "—"}
          </span>
        </div>
      </div>

      <div className="service__actions">
        <button
          type="button"
          className="btn--text"
          onClick={() => onToggle(service.id, isActive)}
        >
          {isActive ? "Pause" : "Resume"}
        </button>

        <select
          className="form__select"
          value={service.interval}
          onChange={(e) => onIntervalChange(service, e.target.value)}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {canIframe && (
          <button
            type="button"
            className="btn--text"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
        )}

        <span className="service__actions-spacer" />

        <button
          type="button"
          className="btn--danger"
          onClick={() => onDelete(service)}
        >
          Remove
        </button>
      </div>

      {showPreview && canIframe && (
        <div className="service__preview-container">
          <div className="service__preview-bar">
            <span>Render Preview</span>
            <span>{service.url}</span>
          </div>
          <iframe
            className="service__preview-frame"
            src={service.url}
            title={`Preview of ${service.url}`}
            sandbox="allow-scripts allow-same-origin allow-forms"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
