import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GamePortal() {
  const [selectedCluster, setSelectedCluster] = useState("");
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Poll backend for team score every 2 seconds
  useEffect(() => {
    if (!selectedCluster) return;
    const interval = setInterval(async () => {
      try {
        const data = await api(`/api/tags/teamScore/${selectedCluster}`);
        setStatus(data);
      } catch (err) {
        console.error("Error fetching team score:", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedCluster]);

  // Auto-close modal after 5 seconds when shown
  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => setShowModal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showModal, tapCount]);

  // UI: cluster selection or game interface
  if (!selectedCluster) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh',
          background: 'linear-gradient(135deg, #2d3748 0%, #6366f1 100%)',
          boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
          borderRadius: '24px',
          maxWidth: '500px',
          margin: '40px auto',
          padding: '48px 32px',
        }}
      >
        <img
          src={import.meta.env.BASE_URL + 'src/assets/react.svg'}
          alt="Cluster Selection"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            marginBottom: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(60,60,120,0.12)'
          }}
        />
        <h2
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '16px',
            color: '#fff',
            letterSpacing: '0.02em',
            textShadow: '0 2px 8px rgba(60,60,120,0.08)',
          }}
        >
          Select Cluster
        </h2>
        <p style={{ color: '#e0e7ff', fontSize: '1.2rem', marginBottom: '24px' }}>
          Please choose your cluster to start the game interface!
        </p>
        <select
          id="cluster-select"
          value={selectedCluster}
          onChange={e => setSelectedCluster(e.target.value)}
          style={{
            padding: '18px 32px',
            fontSize: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #6366f1',
            background: '#fff',
            color: '#2d3748',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(60,60,120,0.08)',
            marginBottom: '32px',
            outline: 'none',
            transition: 'border-color 0.2s',
            zIndex: 2,
            position: 'relative',
          }}
        >
          <option value="" disabled>
            -- Choose Cluster --
          </option>
          <option value="Cluster1">Cluster 1</option>
          <option value="Cluster2">Cluster 2</option>
          <option value="Cluster3">Cluster 3</option>
          <option value="Cluster4">Cluster 4</option>
        </select>
      </div>
    );
  }

  // ...existing game interface and modal code...
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#fff",
        fontSize: "2rem",
        color: "#2d3748",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Modal popup for eligibility */}
      {status && showModal && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#f9fafb",
            borderRadius: "18px",
            boxShadow: "0 8px 32px rgba(60,60,120,0.18)",
            padding: "40px 32px",
            minWidth: "320px",
            zIndex: 10,
            textAlign: "center",
          }}
        >
          {status.error ? (
            <p style={{ fontSize: "2rem", color: "#e53e3e" }}>⚠️ {status.error}</p>
          ) : status.eligible ? (
            <>
              <div style={{ fontSize: "3rem" }}>🎉✅</div>
              <h3 style={{ fontWeight: 700, fontSize: "2rem", margin: "16px 0 8px" }}>
                Eligible to play!
              </h3>
              <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
                You have earned{" "}
                <span style={{ fontWeight: 700 }}>{status.points || 0}</span> points! 🏅
              </p>
              <p style={{ fontSize: "1.1rem", color: "#4a5568" }}>
                Good luck and have fun! 😊
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "3rem" }}>😔❌</div>
              <h3 style={{ fontWeight: 700, fontSize: "2rem", margin: "16px 0 8px" }}>
                Not eligible
              </h3>
              <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
                Sorry, you can't play at this time.
              </p>
              <p style={{ fontSize: "1.1rem", color: "#4a5568" }}>
                Please try again later! 🙏
              </p>
            </>
          )}
          <button
            style={{
              marginTop: "24px",
              padding: "10px 28px",
              fontSize: "1.1rem",
              borderRadius: "8px",
              border: "1px solid #6366f1",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
            }}
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
          <p style={{ fontSize: "0.9rem", color: "#888", marginTop: "8px" }}>
            This popup will close automatically in 5 seconds.
          </p>
        </div>
      )}

      {/* Main content (dimmed when modal is open) */}
      <div
        style={{
          opacity: showModal ? 0.3 : 1,
          pointerEvents: showModal ? "none" : "auto",
          width: "100%",
        }}
      >
        {/* Tap to check eligibility again */}
        <button
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            fontSize: "1.2rem",
            borderRadius: "8px",
            border: "1px solid #6366f1",
            background: "#6366f1",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            marginRight: "16px",
          }}
          onClick={() => {
            setShowModal(true);
            setTapCount(tapCount + 1);
          }}
        >
          Tap to Check Eligibility
        </button>
        <button
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            fontSize: "1.2rem",
            borderRadius: "8px",
            border: "1px solid #2d3748",
            background: "#f3f4f6",
            color: "#2d3748",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onClick={() => setSelectedCluster("")}
        >
          Back
        </button>
      </div>
    </div>
  );
}
