import { FileSearch, FileUp, Plus, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { extractDocuments, submitClaim } from "../api/client.js";
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

const defaultForm = {
  member_id: "",
  member_name: "",
  treatment_date: "",
  member_join_date: "",
  claim_amount: "",
  hospital: "",
  cashless_request: false,
  doctor_name: "",
  doctor_reg: "",
  diagnosis: "",
  medicines: "",
  pre_authorization_id: ""
};

const defaultBillItems = [{ id: crypto.randomUUID(), label: "", amount: "" }];

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBillKey(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function SubmitClaim() {
  const [mode, setMode] = useState("form");
  const [form, setForm] = useState(defaultForm);
  const [billItems, setBillItems] = useState(defaultBillItems);
  const [files, setFiles] = useState([]);
  const [documentText, setDocumentText] = useState("");
  const [extractionResult, setExtractionResult] = useState(null);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(initialClaim, null, 2));
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const generatedClaim = useMemo(() => {
    const bill = {};
    for (const item of billItems) {
      const key = normalizeBillKey(item.label);
      const amount = Number(item.amount);
      if (key && Number.isFinite(amount)) bill[key] = amount;
    }
    const itemizedTotal = Object.values(bill).reduce((sum, amount) => sum + amount, 0);
    const enteredClaimAmount = Number(form.claim_amount);
    const claimAmount = Number.isFinite(enteredClaimAmount) ? Math.max(enteredClaimAmount, itemizedTotal) : itemizedTotal;

    return {
      member_id: form.member_id,
      member_name: form.member_name,
      treatment_date: form.treatment_date,
      ...(form.member_join_date ? { member_join_date: form.member_join_date } : {}),
      claim_amount: claimAmount,
      ...(form.hospital ? { hospital: form.hospital } : {}),
      ...(form.cashless_request ? { cashless_request: true } : {}),
      ...(form.pre_authorization_id ? { pre_authorization_id: form.pre_authorization_id } : {}),
      documents: {
        prescription: {
          doctor_name: form.doctor_name,
          doctor_reg: form.doctor_reg,
          diagnosis: form.diagnosis,
          medicines_prescribed: parseList(form.medicines)
        },
        bill
      },
      uploaded_files: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || "unknown"
      }))
    };
  }, [billItems, files, form]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBillItem(id, field, value) {
    setBillItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addBillItem() {
    setBillItems((current) => [...current, { id: crypto.randomUUID(), label: "medicines", amount: "0" }]);
  }

  function removeBillItem(id) {
    setBillItems((current) => current.filter((item) => item.id !== id));
  }

  function applyExtractedClaim(claim) {
    setForm((current) => ({
      ...current,
      member_id: claim.member_id || current.member_id,
      member_name: claim.member_name || current.member_name,
      treatment_date: claim.treatment_date || current.treatment_date,
      claim_amount: claim.claim_amount ? String(claim.claim_amount) : current.claim_amount,
      hospital: claim.hospital || current.hospital,
      cashless_request: Boolean(claim.cashless_request),
      doctor_name: claim.documents?.prescription?.doctor_name || current.doctor_name,
      doctor_reg: claim.documents?.prescription?.doctor_reg || current.doctor_reg,
      diagnosis: claim.documents?.prescription?.diagnosis || current.diagnosis,
      medicines: claim.documents?.prescription?.medicines_prescribed?.join(", ") || current.medicines,
      pre_authorization_id: claim.pre_authorization_id || current.pre_authorization_id
    }));

    const extractedBillItems = Object.entries(claim.documents?.bill || {}).map(([label, amount]) => ({
      id: crypto.randomUUID(),
      label,
      amount: String(amount)
    }));
    if (extractedBillItems.length > 0) setBillItems(extractedBillItems);
    setJsonInput(JSON.stringify(claim, null, 2));
  }

  async function handleExtract() {
    setError("");
    setExtracting(true);

    try {
      const result = await extractDocuments({ documentText, files });
      setExtractionResult(result);
      applyExtractedClaim(result.extracted_claim);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const claim = mode === "form" ? generatedClaim : JSON.parse(jsonInput);
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
          <h2>Submit OPD claim</h2>
          <p>Upload documents, extract fields, review the claim, then adjudicate.</p>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Claim input mode">
          <button className={mode === "form" ? "active" : ""} onClick={() => setMode("form")} type="button">
            Form
          </button>
          <button className={mode === "json" ? "active" : ""} onClick={() => setMode("json")} type="button">
            JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} className="claim-form">
          {mode === "form" ? (
            <>
              <div className="form-section">
                <h3>Upload documents</h3>
                <label className="upload-zone">
                  <FileUp size={20} />
                  <span>{files.length ? `${files.length} file(s) selected` : "Upload prescription, bill, or report"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md"
                    onChange={(event) => setFiles(Array.from(event.target.files || []))}
                  />
                </label>
                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((file) => (
                      <span className="pill" key={`${file.name}-${file.size}`}>{file.name}</span>
                    ))}
                  </div>
                )}
                <label>
                  Extra document text
                  <textarea
                    className="document-textarea"
                    value={documentText}
                    onChange={(event) => setDocumentText(event.target.value)}
                    placeholder="Optional: paste copied bill or prescription text to help extraction."
                  />
                </label>
                <button className="secondary-button extract-button" onClick={handleExtract} disabled={extracting} type="button">
                  <FileSearch size={17} />
                  <span>{extracting ? "Extracting" : "Extract document fields"}</span>
                </button>
                {extractionResult && (
                  <div className="extraction-summary">
                    <div>
                      <span className="eyebrow">Extraction</span>
                      <strong>{Math.round(extractionResult.confidence_score * 100)}% confidence</strong>
                    </div>
                    <p>{extractionResult.notes}</p>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Review member details</h3>
                <div className="form-grid">
                  <label>
                    Member ID
                    <input value={form.member_id} onChange={(event) => updateForm("member_id", event.target.value)} />
                  </label>
                  <label>
                    Member name
                    <input value={form.member_name} onChange={(event) => updateForm("member_name", event.target.value)} />
                  </label>
                  <label>
                    Treatment date
                    <input type="date" value={form.treatment_date} onChange={(event) => updateForm("treatment_date", event.target.value)} />
                  </label>
                  <label>
                    Join date
                    <input type="date" value={form.member_join_date} onChange={(event) => updateForm("member_join_date", event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>Review prescription</h3>
                <div className="form-grid">
                  <label>
                    Doctor name
                    <input value={form.doctor_name} onChange={(event) => updateForm("doctor_name", event.target.value)} />
                  </label>
                  <label>
                    Doctor registration
                    <input value={form.doctor_reg} onChange={(event) => updateForm("doctor_reg", event.target.value)} />
                  </label>
                  <label className="wide-field">
                    Diagnosis
                    <input value={form.diagnosis} onChange={(event) => updateForm("diagnosis", event.target.value)} />
                  </label>
                  <label className="wide-field">
                    Medicines prescribed
                    <input value={form.medicines} onChange={(event) => updateForm("medicines", event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="section-row">
                  <h3>Review bill items</h3>
                  <button className="secondary-button" onClick={addBillItem} type="button">
                    <Plus size={16} />
                    <span>Add item</span>
                  </button>
                </div>

                <div className="bill-list">
                  {billItems.map((item) => (
                    <div className="bill-row" key={item.id}>
                      <label>
                        Item
                        <input value={item.label} onChange={(event) => updateBillItem(item.id, "label", event.target.value)} />
                      </label>
                      <label>
                        Amount
                        <input type="number" min="0" value={item.amount} onChange={(event) => updateBillItem(item.id, "amount", event.target.value)} />
                      </label>
                      <button className="icon-button danger-button" onClick={() => removeBillItem(item.id)} type="button" title="Remove item">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-grid">
                  <label>
                    Total claim amount
                    <input type="number" min="0" value={form.claim_amount} onChange={(event) => updateForm("claim_amount", event.target.value)} />
                  </label>
                  <label>
                    Hospital
                    <input value={form.hospital} onChange={(event) => updateForm("hospital", event.target.value)} placeholder="Apollo Hospitals" />
                  </label>
                  <label>
                    Pre-auth ID
                    <input value={form.pre_authorization_id} onChange={(event) => updateForm("pre_authorization_id", event.target.value)} />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.cashless_request}
                      onChange={(event) => updateForm("cashless_request", event.target.checked)}
                    />
                    Cashless request
                  </label>
                </div>
              </div>

            </>
          ) : (
            <>
              <label htmlFor="claim-json">Claim JSON</label>
              <textarea
                id="claim-json"
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                spellCheck="false"
              />
            </>
          )}

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
