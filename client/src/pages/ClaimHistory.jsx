import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { listClaims } from "../api/client.js";
import DecisionPanel from "../components/DecisionPanel.jsx";

export default function ClaimHistory() {
  const [claims, setClaims] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadClaims() {
    setError("");
    setLoading(true);

    try {
      const loadedClaims = await listClaims();
      setClaims(loadedClaims);
      setSelectedClaimId((current) => current || loadedClaims[0]?.claimId || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  const selectedClaim = claims.find((claim) => claim.claimId === selectedClaimId);

  return (
    <div className="page-grid">
      <section className="work-panel">
        <div className="history-header">
          <div className="section-heading">
            <span className="eyebrow">MongoDB</span>
            <h2>Claim history</h2>
            <p>Saved submissions appear here after adjudication.</p>
          </div>
          <button className="icon-button" onClick={loadClaims} type="button" title="Refresh history">
            <RefreshCw className={loading ? "spin" : ""} size={18} />
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {claims.length > 0 ? (
          <div className="history-list">
            {claims.map((claim) => (
              <button
                className={selectedClaimId === claim.claimId ? "history-card active" : "history-card"}
                key={claim.claimId}
                onClick={() => setSelectedClaimId(claim.claimId)}
                type="button"
              >
                <div>
                  <span className="eyebrow">{claim.claimId}</span>
                  <h3>{claim.memberName || claim.memberId}</h3>
                  <p>{claim.treatmentDate || "No treatment date"}</p>
                </div>
                <div className="history-meta">
                  <strong>Rs {claim.claimAmount || 0}</strong>
                  <span className={`status-pill ${claim.status?.toLowerCase()}`}>{claim.status}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <p>No saved claims yet. Submit a claim from the intake screen, then refresh.</p>
          </div>
        )}
      </section>

      {selectedClaim ? (
        <section className="detail-stack">
          <section className="work-panel">
            <div className="section-heading">
              <span className="eyebrow">Claim details</span>
              <h2>{selectedClaim.memberName || selectedClaim.memberId}</h2>
              <p>{selectedClaim.claimId}</p>
            </div>
            <div className="metric-grid">
              <div>
                <span>Claim amount</span>
                <strong>Rs {selectedClaim.claimAmount || 0}</strong>
              </div>
              <div>
                <span>Treatment date</span>
                <strong>{selectedClaim.treatmentDate || "-"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedClaim.status}</strong>
              </div>
            </div>
            <div className="info-block">
              <h3>Extracted input</h3>
              <pre className="json-preview">{JSON.stringify(selectedClaim.rawInput || {}, null, 2)}</pre>
            </div>
          </section>

          <DecisionPanel decision={selectedClaim.decision} />
        </section>
      ) : (
        <DecisionPanel decision={null} />
      )}
    </div>
  );
}
