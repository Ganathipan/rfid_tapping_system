import React, { useState } from "react";
import { checkEligibility } from "./EligibilityChecker";

export default function ClusterTap() {
  const [rfidTag, setRfidTag] = useState("");
  const [eligible, setEligible] = useState(null);

  function handleTap() {
    // Simulate tap
    const result = checkEligibility(rfidTag);
    setEligible(result);
  }

  return (
    <div>
      <h3>Check Game Eligibility</h3>
      <input
        type="text"
        placeholder="Enter RFID tag"
        value={rfidTag}
        onChange={e => setRfidTag(e.target.value)}
      />
      <button onClick={handleTap}>Check Eligibility</button>
      {eligible !== null && (
        <div>
          {eligible ? (
            <span style={{ color: "green" }}>Eligible to play!</span>
          ) : (
            <span style={{ color: "red" }}>Not eligible to play.</span>
          )}
        </div>
      )}
    </div>
  );
}
