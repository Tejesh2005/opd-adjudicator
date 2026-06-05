# API Documentation

Local base URL: `http://localhost:4000/api`

Production base URL: `https://opd-adjudicator-api.onrender.com/api`

## Health

`GET /health`

Returns service and database status.

## Submit Claim

`POST /claims`

Request body:

```json
{
  "member_id": "EMP001",
  "member_name": "Rajesh Kumar",
  "treatment_date": "2024-11-01",
  "claim_amount": 1500,
  "documents": {
    "prescription": {
      "doctor_name": "Dr. Sharma",
      "doctor_reg": "KA/45678/2015",
      "diagnosis": "Viral fever"
    },
    "bill": {
      "consultation_fee": 1000,
      "diagnostic_tests": 500,
      "gst": 0
    }
  }
}
```

Response:

```json
{
  "claim": {
    "claimId": "CLM_12345678",
    "status": "APPROVED"
  },
  "decision": {
    "claim_id": "CLM_12345678",
    "decision": "APPROVED",
    "approved_amount": 1350,
    "rejection_reasons": [],
    "confidence_score": 0.95,
    "notes": "Claim satisfies policy, document, coverage, and limit checks."
  }
}
```

## List Claims

`GET /claims`

Returns saved claims when MongoDB is connected. Returns an empty array when running without MongoDB.

## Extract Documents

`POST /extraction`

Accepts `multipart/form-data`.

Fields:

- `documentText`: optional OCR/copied prescription and bill text
- `documents`: optional uploaded image, PDF, text, or Markdown files

Behavior:

- Uses Gemini extraction for text, image, and PDF input when `GEMINI_API_KEY` is configured.
- Uses OpenAI extraction when Gemini is unavailable and `OPENAI_API_KEY` is configured.
- Falls back to the local parser when no LLM key is configured or when the LLM calls fail.
- Extracts GST/tax as a bill item when present and includes it in the claim amount.
- Gemini/OpenAI return an extraction confidence score; the local parser estimates confidence from extraction completeness.

Response:

```json
{
  "extracted_claim": {
    "member_id": "EMP001",
    "member_name": "Rajesh Kumar",
    "treatment_date": "2024-11-01",
    "claim_amount": 1500,
    "documents": {
      "prescription": {
        "doctor_name": "Dr. Sharma",
        "doctor_reg": "KA/45678/2015",
        "diagnosis": "Viral fever",
        "medicines_prescribed": ["Paracetamol 650mg"]
      },
      "bill": {
        "consultation_fee": 1000,
        "diagnostic_tests": 500,
        "gst": 0
      }
    }
  },
  "confidence_score": 0.92,
  "extraction_method": "gemini_llm",
  "notes": "Gemini extracted structured fields; deterministic policy rules still make the adjudication decision."
}
```

## Get Claim

`GET /claims/:claimId`

Returns one persisted claim.

## Re-adjudicate Claim Payload

`POST /claims/:claimId/adjudicate`

Runs the adjudication engine against a claim payload and uses the path parameter as the claim ID.

## Get Test Cases

`GET /test-cases`

Returns the provided assignment scenarios.

## Run Test Cases

`POST /test-cases/run`

Returns pass/fail output for all provided scenarios.
