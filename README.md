# Plum OPD Claim Adjudication Tool

AI-assisted full-stack application for adjudicating outpatient department insurance claims against Plum-style policy terms.

## Stack

- React + Vite frontend
- Node.js + Express backend
- MongoDB via Mongoose
- Deterministic adjudication engine
- Optional LLM/OCR extension point for document extraction

## Local Setup

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev
```

The app runs at:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

MongoDB is optional for local demo. If `MONGODB_URI` is not set, adjudication and test-case running still work, but claim history is not persisted.

## Accuracy Check

Run the supplied assignment test cases:

```bash
npm run test --prefix server
```

Or open the frontend and use the **Test Cases** tab.

## Key Design Choice

The LLM should extract structured fields from medical documents, but the final approval/rejection is made by deterministic rules. This keeps claim outcomes explainable and repeatable.

## Documentation

- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Decision Flow](docs/decision-flow.md)
- [Assumptions](docs/assumptions.md)
