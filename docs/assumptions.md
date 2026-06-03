# Assumptions

- The provided JSON test cases represent already-extracted medical document data.
- OCR and LLM extraction are treated as an extension point for the MVP.
- Doctor registration validation is format-based, not registry-verified.
- Member coverage is assumed valid when a member ID is present, unless a rule-specific issue is detected.
- Annual utilization and duplicate claim databases are not available in the assignment package.
- Network hospital discount is applied before final cashless approval.
- Consultation co-pay is applied to the total simple OPD claim amount to match the provided expected outcome.
- Mixed dental claims can receive partial approval even when the submitted total exceeds the normal per-claim limit, because the supplied expected output approves the covered dental component.
