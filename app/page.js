"use client";

import { useState, useEffect, useCallback } from "react";

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
  }, [fetchServices]);

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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletingService, isDeleting, pendingIntervalChange, isUpdatingInterval]);

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
      <header className="header">
        <h1 className="header__title">Keep-Alive</h1>
        <p className="header__description">
          Ping your Render free-tier services to prevent spin-down.
          Add a URL, set the interval, start monitoring.
        </p>
      </header>

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
          <div className="services__empty">No services monitored</div>
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

      <footer className="footer">
        <p className="footer__text">
          Data stored via browser cookie. Clearing cookies or switching devices
          will reset your configuration.
        </p>
      </footer>

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
