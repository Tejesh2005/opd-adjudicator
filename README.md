# Plum OPD Claim Adjudication Tool

AI-assisted full-stack application for adjudicating outpatient department insurance claims against Plum-style policy terms.

## Live Deployment

- Frontend: https://opd-adjudicator.vercel.app/
- Backend API: https://opd-adjudicator-api.onrender.com
- Backend health check: https://opd-adjudicator-api.onrender.com/health

## Stack

- React + Vite frontend
- Node.js + Express backend
- MongoDB via Mongoose
- Deterministic adjudication engine
- Gemini/OpenAI LLM extraction with local parser fallback

## Local Setup

Prerequisites:

- Node.js 18 or newer
- npm
- Optional: MongoDB Atlas connection string for persisted claim history
- Optional: Gemini API key for uploaded image/PDF extraction

Install dependencies from the project root:

```bash
npm run install:all
```

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

Fill `server/.env`:

```env
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_key
GEMINI_EXTRACTION_MODEL=gemini-2.5-flash
OPENAI_API_KEY=your_openai_key_optional
OPENAI_EXTRACTION_MODEL=gpt-4.1-mini
CLIENT_ORIGIN=http://localhost:5173
```

Start the frontend and backend together:

```bash
npm run dev
```

The app runs at:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

MongoDB is optional for local demo. If `MONGODB_URI` is not set, adjudication and test-case running still work, but claim history is not persisted.

LLM extraction is optional. If `GEMINI_API_KEY` is set, `/api/extraction` uses Gemini to extract claim fields from pasted text, uploaded images, and uploaded PDFs. If Gemini is unavailable, it tries OpenAI for text extraction when `OPENAI_API_KEY` is set. If both are missing or fail, the app automatically falls back to the local parser.

For deployment, configure the frontend with:

```env
VITE_API_BASE_URL=https://opd-adjudicator-api.onrender.com/api
```

Configure the backend with:

```env
MONGODB_URI=your_mongodb_uri
GEMINI_API_KEY=your_gemini_key
GEMINI_EXTRACTION_MODEL=gemini-2.5-flash
OPENAI_API_KEY=your_openai_key_optional
OPENAI_EXTRACTION_MODEL=gpt-4.1-mini
CLIENT_ORIGIN=https://opd-adjudicator.vercel.app
```

## Accuracy Check

Run the supplied assignment test cases:

```bash
npm run test --prefix server
```

Or open the frontend and use the **Test Cases** tab.

Build the frontend production bundle:

```bash
npm run build --prefix client
```

## Key Design Choice

The LLM extracts structured fields from medical documents, but the final approval/rejection is made by deterministic rules. This keeps claim outcomes explainable and repeatable.

## Documentation

- [Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Decision Flow](docs/decision-flow.md)
- [Assumptions](docs/assumptions.md)
- [Policy Coverage](docs/policy-coverage.md)
- [Original Assignment References](docs/reference)
