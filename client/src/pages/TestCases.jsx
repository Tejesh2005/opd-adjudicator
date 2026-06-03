import { Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { runTestCases } from "../api/client.js";
import DecisionPanel from "../components/DecisionPanel.jsx";

export default function TestCases() {
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun() {
    setError("");
    setLoading(true);

    try {
      const data = await runTestCases();
      setSummary(data);
      setSelected(data.results[0]);
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
          <span className="eyebrow">Validation</span>
          <h2>Provided test case runner</h2>
          <p>Runs the ten assignment scenarios against the deterministic rule engine.</p>
        </div>

        <button className="primary-button" onClick={handleRun} disabled={loading} type="button">
          {loading ? <RefreshCw className="spin" size={18} /> : <Play size={18} />}
          <span>{loading ? "Running" : "Run Test Cases"}</span>
        </button>

        {error && <p className="form-error">{error}</p>}

        {summary && (
          <>
            <div className="score-strip">
              <div>
                <span>Total</span>
                <strong>{summary.total}</strong>
              </div>
              <div>
                <span>Passed</span>
                <strong>{summary.passed}</strong>
              </div>
              <div>
                <span>Failed</span>
                <strong>{summary.failed}</strong>
              </div>
            </div>

            <div className="case-list">
              {summary.results.map((result) => (
                <button
                  className={selected?.case_id === result.case_id ? "case-row active" : "case-row"}
                  key={result.case_id}
                  onClick={() => setSelected(result)}
                  type="button"
                >
                  <span className={result.passed ? "status-pass" : "status-fail"}>{result.passed ? "PASS" : "FAIL"}</span>
                  <div>
                    <strong>{result.case_id}</strong>
                    <p>{result.case_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <DecisionPanel decision={selected?.actual} />
    </div>
  );
}
