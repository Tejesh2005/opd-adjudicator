# Decision Flow

```mermaid
flowchart TD
  A["Claim submitted"] --> B{"Policy active?"}
  B -- "No" --> R1["Reject: POLICY_INACTIVE"]
  B -- "Yes" --> C{"Fraud or high-risk pattern?"}
  C -- "Yes" --> M["Manual review"]
  C -- "No" --> D{"Prescription and bill present?"}
  D -- "No" --> R2["Reject: MISSING_DOCUMENTS"]
  D -- "Yes" --> E{"Doctor registration valid?"}
  E -- "No" --> R3["Reject: DOCTOR_REG_INVALID"]
  E -- "Yes" --> S{"Submitted within 30 days if submission date exists?"}
  S -- "No" --> R8["Reject: LATE_SUBMISSION"]
  S -- "Yes" --> N{"Minimum claim amount met?"}
  N -- "No" --> R9["Reject: BELOW_MIN_AMOUNT"]
  N -- "Yes" --> F{"Waiting period satisfied?"}
  F -- "No" --> R4["Reject: WAITING_PERIOD"]
  F -- "Yes" --> G{"Excluded service?"}
  G -- "Yes" --> R5["Reject: SERVICE_NOT_COVERED"]
  G -- "No" --> H{"Pre-auth required and missing?"}
  H -- "Yes" --> R6["Reject: PRE_AUTH_MISSING"]
  H -- "No" --> I{"Partial approval possible?"}
  I -- "Yes" --> P["Partially approve covered items"]
  I -- "No" --> J{"Within per-claim limit?"}
  J -- "No" --> R7["Reject: PER_CLAIM_EXCEEDED"]
  J -- "Yes" --> K["Apply co-pay or network discount"]
  K --> L["Approve claim"]
```

## Priority Rules

- Fraud and safety concerns go to manual review early.
- The 30-day submission timeline is checked only when a submission date is available.
- GST/tax is included in the itemized claim amount when it appears on a bill.
- Exclusions and pre-authorization checks happen before amount limits.
- Partial approval is supported for mixed covered and excluded items.
- Hard limits are enforced when partial approval does not apply.
- Every response includes a rule trace for explainability.
