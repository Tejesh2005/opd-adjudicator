# Assumptions

- The provided JSON test cases represent already-extracted medical document data.
- Gemini LLM extraction handles uploaded images/PDFs and pasted text. OpenAI text extraction and local parser fallback are available if Gemini is unavailable.
- Gemini/OpenAI provide extraction confidence; local parser confidence is estimated from extracted-field completeness.
- Doctor registration validation is format-based, not registry-verified.
- Member coverage is assumed valid when a member ID is present, unless a rule-specific issue is detected.
- Annual utilization and duplicate claim databases are not available in the assignment package.
- GST/tax printed on a valid bill is treated as part of the submitted claim amount unless the policy explicitly excludes it.
- Subtotal, total, amount paid, and change lines are not treated as bill items to avoid double counting.
- Paid amount versus outstanding balance is not fully adjudicated as a separate rule; the current MVP focuses on the submitted claim amount and itemized bill fields.
- Network hospital discount is applied before final cashless approval.
- Consultation co-pay is applied to the total simple OPD claim amount to match the provided expected outcome.
- Mixed dental claims can receive partial approval even when the submitted total exceeds the normal per-claim limit, because the supplied expected output approves the covered dental component.
