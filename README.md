# Plum OPD Claim Adjudication Tool

AI-assisted full-stack application for adjudicating outpatient department insurance claims against Plum-style policy terms.

## Stack

- React + Vite frontend
- Node.js + Express backend
- MongoDB via Mongoose
- Deterministic adjudication engine
- Gemini/OpenAI LLM extraction with local parser fallback

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

LLM extraction is optional. If `GEMINI_API_KEY` is set, `/api/extraction` uses Gemini to extract claim fields from pasted text, uploaded images, and uploaded PDFs. If Gemini is unavailable, it tries OpenAI for text extraction when `OPENAI_API_KEY` is set. If both are missing or fail, the app automatically falls back to the local parser.

```env
GEMINI_API_KEY=your_key_here
GEMINI_EXTRACTION_MODEL=gemini-2.5-flash
OPENAI_API_KEY=your_key_here
OPENAI_EXTRACTION_MODEL=gpt-4.1-mini
```

## Accuracy Check

Run the supplied assignment test cases:

```bash
npm run test --prefix server
```

Or open the frontend and use the **Test Cases** tab.

## Key Design Choice

The LLM extracts structured fields from medical documents, but the final approval/rejection is made by deterministic rules. This keeps claim outcomes explainable and repeatable.

## Documentation

- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Decision Flow](docs/decision-flow.md)
- [Assumptions](docs/assumptions.md)
- [Original Assignment References](docs/reference)
