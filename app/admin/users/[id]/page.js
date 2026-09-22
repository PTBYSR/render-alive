"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const [openPreviews, setOpenPreviews] = useState({});
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`);
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      if (!res.ok) {
        setError("Failed to load user details");
        return;
      }
      const json = await res.json();
      setUserData(json);
    } catch {
      setError("Network error loading user");
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = (serviceId) => {
    setOpenPreviews((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  if (loading) {
    return (
      <main className="admin-container">
        <div className="loading">Loading user telemetry…</div>
      </main>
    );
  }

  if (error || !userData) {
    return (
      <main className="admin-container">
        <Link href="/admin" className="back-link">
          ← Back to Users Directory
        </Link>
        <div className="message message--error">{error || "User not found"}</div>
      </main>
    );
  }

  return (
    <main className="admin-container">
      <Link href="/admin" className="back-link">
        ← Back to Users Directory
      </Link>

      <header className="admin-header">
        <div className="admin-header__title-group">
          <h1 className="header__title" style={{ margin: 0 }}>User Profile</h1>
          <span className="admin-header__badge">Detail</span>
        </div>
        <button type="button" className="btn--text" onClick={loadUserData}>
          Refresh Telemetry
        </button>
      </header>

      {/* User Identity Card */}
      <section className="user-detail__card">
        <div className="user-detail__title">Device / User ID</div>
        <div className="user-detail__id">{userData.userId}</div>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-secondary)" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Services: </span>
            <strong style={{ fontFamily: "var(--mono)" }}>{userData.serviceCount} / 3 slots</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Active: </span>
            <strong style={{ fontFamily: "var(--mono)" }}>{userData.activeCount} active</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Paused: </span>
            <strong style={{ fontFamily: "var(--mono)" }}>{userData.serviceCount - userData.activeCount} paused</strong>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="admin-section__title" style={{ margin: 0 }}>Registered Services ({userData.services?.length || 0})</h2>
          <button
            type="button"
            className="btn--text"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? "Hide Raw Data" : "Inspect Raw JSON"}
          </button>
        </div>

        {userData.services?.length === 0 ? (
          <div className="services__empty">This user has no active services.</div>
        ) : (
          userData.services.map((service) => {
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
              <div key={service.id} className="service" style={{ border: "1px solid var(--border)", padding: "20px", marginBottom: "16px", background: "var(--white)" }}>
                <div className="service__url" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <a href={service.url} target="_blank" rel="noopener noreferrer">
                      {service.url}
                    </a>
                    {isHtml ? (
                      <span className="service__badge">Web</span>
                    ) : (
                      <span className="service__badge">API</span>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    ID: {service.id}
                  </span>
                </div>

                <div className="service__meta" style={{ marginTop: "16px" }}>
                  <div className="service__meta-item">
                    <span className="service__meta-label">Status</span>
                    <span className="service__meta-value">
                      <span className={`status__dot ${dotClass}`} />
                      {label}
                    </span>
                  </div>

                  <div className="service__meta-item">
                    <span className="service__meta-label">Last Ping</span>
                    <span className="service__meta-value">
                      {timeAgo(service.lastPingAt)}
                      {service.lastStatus && (
                        <>
                          {" "}
                          <span className={service.lastStatus === "200" ? "http-code http-code--ok" : "http-code http-code--error"}>
                            {service.lastStatus}
                          </span>
                        </>
                      )}
                      {service.lastLatency && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {" "}({service.lastLatency}ms)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="service__meta-item">
                    <span className="service__meta-label">Interval</span>
                    <span className="service__meta-value">
                      {formatInterval(service.interval)}
                    </span>
                  </div>

                  <div className="service__meta-item">
                    <span className="service__meta-label">Next Ping</span>
                    <span className="service__meta-value">
                      {isActive ? timeUntil(service.nextPingAt) : "—"}
                    </span>
                  </div>
                </div>

                {canIframe && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="btn--text"
                      onClick={() => togglePreview(service.id)}
                    >
                      {isPreviewOpen ? "Hide Preview" : "View Live Preview"}
                    </button>

                    {isPreviewOpen && (
                      <div className="service__preview-container">
                        <div className="service__preview-bar">
                          <span>Live Site Frame</span>
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
                )}
              </div>
            );
          })
        )}

        {showRaw && (
          <div style={{ marginTop: "24px" }}>
            <div className="admin-section__title">Raw User Redis Record</div>
            <pre
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                padding: "16px",
                background: "var(--gray-50)",
                border: "1px solid var(--border)",
                overflowX: "auto",
                lineHeight: "1.6",
              }}
            >
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
