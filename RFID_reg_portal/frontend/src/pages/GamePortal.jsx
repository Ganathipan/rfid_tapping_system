import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GamePortal() {
  const [selectedCluster, setSelectedCluster] = useState("");
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [lastTap, setLastTap] = useState(null);

  // Poll backend for team score every 2 seconds
  useEffect(() => {
    if (!selectedCluster) return;
    const interval = setInterval(async () => {
      try {
        const data = await api(`/api/tags/teamScore/${selectedCluster}`);
        setStatus(data);
        // Show popup only when a new tap is detected
        if (data.lastTap && data.lastTap !== lastTap) {
          setShowModal(true);
          setLastTap(data.lastTap);
        }
      } catch (err) {
        console.error("Error fetching team score:", err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedCluster, lastTap]);

  // Auto-close modal after 5 seconds when shown
  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => setShowModal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  // UI: cluster selection or game interface
  if (!selectedCluster) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #6366f1 0%, #2d3748 100%)',
          boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
          borderRadius: '24px',
          maxWidth: '100vw',
          margin: '0 auto',
          padding: '32px 8vw',
        }}
      >
        <img
          src={import.meta.env.BASE_URL + 'src/assets/react.svg'}
          alt="Cluster Selection"
          style={{
            width: '90px',
            height: '90px',
            objectFit: 'contain',
            marginBottom: '18px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(60,60,120,0.12)'
          }}
        />
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '12px',
            color: '#fff',
            letterSpacing: '0.02em',
            textShadow: '0 2px 8px rgba(60,60,120,0.08)',
          }}
        >
          Select Cluster
        </h2>
        <p style={{ color: '#e0e7ff', fontSize: '1rem', marginBottom: '18px', textAlign: 'center' }}>
          Please choose your cluster to start the game interface!
        </p>
        <select
          id="cluster-select"
          value={selectedCluster}
          onChange={e => setSelectedCluster(e.target.value)}
          style={{
            padding: '14px 18px',
            fontSize: '1.1rem',
            borderRadius: '10px',
            border: '2px solid #6366f1',
            background: '#fff',
            color: '#2d3748',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(60,60,120,0.08)',
            marginBottom: '24px',
            outline: 'none',
            transition: 'border-color 0.2s',
            zIndex: 2,
            position: 'relative',
            width: '100%',
            maxWidth: '320px',
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
        minHeight: "100vh",
        background: "#fff",
        fontSize: "2rem",
        color: "#2d3748",
        flexDirection: "column",
        position: "relative",
        padding: "0 4vw",
      }}
    >
      {/* Modal popup for eligibility */}
      {status && showModal && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#f9fafb",
            borderRadius: "18px",
            boxShadow: "0 8px 32px rgba(60,60,120,0.18)",
            padding: "32px 18px",
            minWidth: "260px",
            maxWidth: "90vw",
            zIndex: 10,
            textAlign: "center",
          }}
        >
          {status.error ? (
            <p style={{ fontSize: "1.5rem", color: "#e53e3e" }}>⚠️ {status.error}</p>
          ) : status.eligible ? (
            <>
              <div style={{ fontSize: "2.2rem" }}>🎉✅</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.3rem", margin: "12px 0 8px" }}>
                Eligible to play!
              </h3>
              <p style={{ fontSize: "1.1rem", marginBottom: "10px" }}>
                You have earned{" "}
                <span style={{ fontWeight: 700 }}>{status.points || 0}</span> points! 🏅
              </p>
              <p style={{ fontSize: "1rem", color: "#4a5568" }}>
                Good luck and have fun! 😊
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2.2rem" }}>😔❌</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.3rem", margin: "12px 0 8px" }}>
                Not eligible
              </h3>
              <p style={{ fontSize: "1.1rem", marginBottom: "10px" }}>
                Sorry, you can't play at this time.
              </p>
              <p style={{ fontSize: "1rem", color: "#4a5568" }}>
                Please try again later! 🙏
              </p>
            </>
          )}
          <button
            style={{
              marginTop: "18px",
              padding: "8px 18px",
              fontSize: "1rem",
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
          <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "6px" }}>
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
          maxWidth: "420px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            background: 'linear-gradient(135deg, #6366f1 0%, #2d3748 100%)',
            borderRadius: '18px',
            boxShadow: '0 4px 16px rgba(60,60,120,0.10)',
            padding: '32px 8vw',
            marginBottom: '18px',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          <img
            src={import.meta.env.BASE_URL + 'src/assets/react.svg'}
            alt="Tap Card"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              marginBottom: '18px',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(60,60,120,0.12)'
            }}
          />
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem', marginBottom: '18px', textAlign: 'center' }}>
            Please tap your card
          </h2>
          <p style={{ color: '#e0e7ff', fontSize: '1rem', marginBottom: '12px', textAlign: 'center' }}>
            The system will detect your card automatically
          </p>
        </div>
        <button
          style={{
            marginTop: "18px",
            padding: "10px 28px",
            fontSize: "1.1rem",
            borderRadius: "8px",
            border: "1px solid #2d3748",
            background: "#f3f4f6",
            color: "#2d3748",
            fontWeight: 500,
            cursor: "pointer",
            width: '100%',
            maxWidth: '320px',
          }}
          onClick={() => setSelectedCluster("")}
        >
          Back
        </button>
      </div>
    </div>
  );
}
