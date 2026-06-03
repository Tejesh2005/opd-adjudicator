import { AlertTriangle, CheckCircle2, Clock3, SplitSquareHorizontal } from "lucide-react";

const icons = {
  APPROVED: CheckCircle2,
  REJECTED: AlertTriangle,
  PARTIAL: SplitSquareHorizontal,
  MANUAL_REVIEW: Clock3
};

export default function DecisionPanel({ decision }) {
  if (!decision) {
    return (
      <section className="empty-state">
        <p>Submit a claim or run the test suite to see adjudication results.</p>
      </section>
    );
  }

  const Icon = icons[decision.decision] || Clock3;

  return (
    <section className="decision-panel">
      <div className={`decision-header ${decision.decision.toLowerCase()}`}>
        <Icon size={24} />
        <div>
          <span className="eyebrow">Decision</span>
          <h2>{decision.decision.replace("_", " ")}</h2>
        </div>
      </div>

      <div className="metric-grid">
        <div>
          <span>Approved amount</span>
          <strong>Rs {decision.approved_amount || 0}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>{Math.round((decision.confidence_score || 0) * 100)}%</strong>
        </div>
        <div>
          <span>Network discount</span>
          <strong>Rs {decision.network_discount || 0}</strong>
        </div>
      </div>

      {decision.rejection_reasons?.length > 0 && (
        <div className="info-block">
          <h3>Rejection reasons</h3>
          <div className="pill-row">
            {decision.rejection_reasons.map((reason) => (
              <span className="pill danger" key={reason}>{reason}</span>
            ))}
          </div>
        </div>
      )}

      {decision.rejected_items?.length > 0 && (
        <div className="info-block">
          <h3>Rejected items</h3>
          <div className="pill-row">
            {decision.rejected_items.map((item) => (
              <span className="pill" key={item}>{item}</span>
            ))}
          </div>
        </div>
      )}

      {decision.flags?.length > 0 && (
        <div className="info-block">
          <h3>Manual review flags</h3>
          <div className="pill-row">
            {decision.flags.map((flag) => (
              <span className="pill warning" key={flag}>{flag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="info-block">
        <h3>Notes</h3>
        <p>{decision.notes || "No notes recorded."}</p>
        <p className="muted">{decision.next_steps}</p>
      </div>

      <div className="info-block">
        <h3>Rule trace</h3>
        <ul className="rule-list">
          {decision.rule_results?.map((rule) => (
            <li key={`${rule.name}-${rule.message}`}>
              <span className={rule.passed ? "dot pass" : "dot fail"} />
              <div>
                <strong>{rule.name}</strong>
                <p>{rule.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
