# API Documentation

Base URL: `http://localhost:4000/api`

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
      "diagnostic_tests": 500
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
