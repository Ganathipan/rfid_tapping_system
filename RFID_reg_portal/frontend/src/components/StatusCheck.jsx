import { useState } from "react";

export default function StatusCheck() {
  const [rfid, setRfid] = useState("");
  const [status, setStatus] = useState(null);

  const checkStatus = async () => {
    if (!rfid) return;
    try {
      const res = await fetch(`http://localhost:4000/api/tags/status/${rfid}`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ error: "⚠️ Server not reachable" });
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <input
        placeholder="Enter RFID"
        value={rfid}
        onChange={(e) => setRfid(e.target.value)}
        style={{
          padding: "8px",
          marginRight: "10px",
          width: "200px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      <button onClick={checkStatus} style={{ padding: "8px 12px" }}>
        Check
      </button>

      {status && (
        <div style={{ marginTop: "20px", fontSize: "18px" }}>
          {status.error ? (
            <p>{status.error}</p>
          ) : (
            <>
              <p>Points: {status.points}</p>
              <p>
                {status.eligible ? "✅ You can play!" : "❌ Not enough points"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
