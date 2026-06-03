import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { listClaims } from "../api/client.js";

export default function ClaimHistory() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadClaims() {
    setError("");
    setLoading(true);

    try {
      setClaims(await listClaims());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  return (
    <section className="work-panel full-width">
      <div className="history-header">
        <div className="section-heading">
          <span className="eyebrow">MongoDB</span>
          <h2>Claim history</h2>
          <p>Persisted claims appear here after MongoDB is connected.</p>
        </div>
        <button className="icon-button" onClick={loadClaims} type="button" title="Refresh history">
          <RefreshCw className={loading ? "spin" : ""} size={18} />
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Member</th>
              <th>Treatment date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.claimId}>
                <td>{claim.claimId}</td>
                <td>{claim.memberName || claim.memberId}</td>
                <td>{claim.treatmentDate}</td>
                <td>Rs {claim.claimAmount}</td>
                <td><span className="pill">{claim.status}</span></td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan="5">No saved claims yet. Add `MONGODB_URI` to enable persistence.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
