# Policy Coverage

This matrix maps `policy_terms.json` and `adjudication_rules.md` to the implemented MVP behavior.

## Implemented

| Policy / Rule Area | Implementation |
| --- | --- |
| Policy effective date | Rejects treatment before `2024-01-01` with `POLICY_INACTIVE`. |
| Required documents | Requires prescription and bill; rejects with `MISSING_DOCUMENTS`. |
| Doctor registration | Validates council-style registration format and rejects with `DOCTOR_REG_INVALID`. |
| Submission timeline | Rejects when `submission_date` is more than 30 days after treatment. |
| Minimum claim amount | Rejects claims below Rs 500 with `BELOW_MIN_AMOUNT`. |
| Diabetes / hypertension waiting period | Checks 90-day waiting period when `member_join_date` is present. |
| Weight loss exclusion | Rejects obesity, bariatric, weight loss, and diet-plan claims. |
| Cosmetic dental exclusion | Partially approves covered dental work and rejects teeth whitening/cosmetic items. |
| MRI pre-authorization | Rejects MRI claims above Rs 10000 when pre-auth is missing. |
| Per-claim limit | Rejects non-partial claims above Rs 5000. |
| Alternative medicine | Approves Ayurveda/Homeopathy/Unani-style claims within policy limits. |
| Network cashless | Approves cashless claims at configured network hospitals under Rs 5000 and applies 20% network discount. |
| Consultation co-pay | Applies 10% co-pay to standard OPD reimbursement claims. |
| GST / tax on bills | Extracts GST/tax as a bill item when present and includes it in the itemized claim amount. |
| Fraud/manual review | Routes multiple same-day claims or high-value claims to `MANUAL_REVIEW`. |
| Decision output | Returns decision, approved amount, rejection reasons, confidence, notes, next steps, and rule trace. |
| Official tests | All 10 provided test cases pass. |

## Partially Implemented Or Assumed

| Policy / Rule Area | Current Treatment |
| --- | --- |
| Member verification | Assumes a member is covered when a member ID is present; no full member roster was provided. |
| Patient detail matching | Extracted patient fields are shown for review, but there is no authoritative policy member database to compare against. |
| Hospital/clinic registry verification | Doctor registration format is checked; provider registry lookup is not available in the assignment package. |
| Annual limit / family floater limit | Requires year-to-date claim history per member/family. MongoDB stores claims, but full historical utilization accounting is not implemented. |
| Category sub-limits beyond tested scenarios | Implemented for alternative medicine and dental partial approval; full generic sub-limit accounting for every category is a future extension. |
| Pharmacy generic drug rule / branded copay | Not fully implemented because drug generic/brand metadata is not provided. |
| Vision benefits and LASIK exclusion | Not fully implemented as no vision test cases or sample policy records were provided. |
| Initial waiting period / pre-existing disease 365-day rule | Specific diabetes/hypertension waiting period is implemented; full pre-existing disease classification is assumed to require medical/member history. |
| Diagnostic report necessity | Diagnosis and document fields are extracted and reviewed; clinical-grade necessity validation is not implemented. |
| Fraud document forensics | Pattern-based manual review exists; forged/altered document detection is a future OCR/vision enhancement. |
| Regional language / handwriting | Gemini may handle these, but deterministic validation depends on extraction quality. |

## Rationale

The assignment asks for a working MVP. The system prioritizes repeatable adjudication for the provided policy and official test cases while documenting external-data dependencies clearly.
