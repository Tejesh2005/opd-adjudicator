import { Send } from "lucide-react";
import { useState } from "react";
import { submitClaim } from "../api/client.js";
import DecisionPanel from "../components/DecisionPanel.jsx";

const initialClaim = {
  member_id: "EMP001",
  member_name: "Rajesh Kumar",
  treatment_date: "2024-11-01",
  claim_amount: 1500,
  documents: {
    prescription: {
      doctor_name: "Dr. Sharma",
      doctor_reg: "KA/45678/2015",
      diagnosis: "Viral fever",
      medicines_prescribed: ["Paracetamol 650mg", "Vitamin C"]
    },
    bill: {
      consultation_fee: 1000,
      diagnostic_tests: 500
    }
  }
};

export default function SubmitClaim() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(initialClaim, null, 2));
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const claim = JSON.parse(jsonInput);
      const response = await submitClaim(claim);
      setDecision(response.decision);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="work-panel">
        <div className="section-heading">
          <span className="eyebrow">Claim intake</span>
          <h2>Submit structured OPD claim</h2>
          <p>Paste extracted document data or use the default sample claim.</p>
        </div>

        <form onSubmit={handleSubmit} className="claim-form">
          <label htmlFor="claim-json">Claim JSON</label>
          <textarea
            id="claim-json"
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            spellCheck="false"
          />

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={loading} type="submit">
            <Send size={18} />
            <span>{loading ? "Adjudicating" : "Adjudicate Claim"}</span>
          </button>
        </form>
      </section>

      <DecisionPanel decision={decision} />
    </div>
  );
}
