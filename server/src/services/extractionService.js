import OpenAI from "openai";

export function normalizeClaimPayload(payload) {
  if (payload?.input_data) return payload.input_data;
  if (payload?.claim) return payload.claim;
  return payload;
}

export function buildUploadPlaceholder({ body, files }) {
  const structuredClaim = body.structuredClaim ? JSON.parse(body.structuredClaim) : body;

  return {
    ...structuredClaim,
    uploaded_files: files?.map((file) => ({
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size
    })) || []
  };
}

function isTextFile(file) {
  return file.mimetype?.startsWith("text/") || file.originalname.endsWith(".md");
}

function isGeminiReadableFile(file) {
  return file.mimetype?.startsWith("image/") || file.mimetype === "application/pdf";
}

function collectDocumentText({ documentText = "", files = [] }) {
  const uploadedText = files
    .filter((file) => isTextFile(file))
    .map((file) => file.buffer.toString("utf8"))
    .join("\n");

  return `${documentText}\n${uploadedText}`;
}

function firstMatch(text, patterns, fallback = "") {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return fallback;
}

function toIsoDate(value) {
  if (!value) return "";
  const normalized = value.trim();
  const slashDate = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return normalized;
}

function parseAmount(value) {
  if (!value) return 0;
  return Number(value.replace(/[,₹Rs.\s]/gi, "")) || 0;
}

function parseBillItems(text) {
  const itemPatterns = [
    ["consultation_fee", /consultation(?:\s+fee)?\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["diagnostic_tests", /diagnostic(?:\s+tests?)?\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["medicines", /(?:medicines?|pharmacy)\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["therapy_charges", /therapy(?:\s+charges?)?\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["root_canal", /root\s+canal\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["teeth_whitening", /teeth\s+whitening\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["mri_scan", /mri(?:\s+scan)?\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i],
    ["diet_plan", /diet\s+plan\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i]
  ];

  const bill = {};
  for (const [key, pattern] of itemPatterns) {
    const amount = parseAmount(firstMatch(text, [pattern]));
    if (amount > 0) bill[key] = amount;
  }

  return bill;
}

function splitList(value) {
  return value
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseClaimLocally({ text, files = [] }) {
  const bill = parseBillItems(text);
  const totalFromBill = parseAmount(firstMatch(text, [
    /total\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i,
    /claim\s+amount\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+)/i
  ]));
  const billTotal = Object.values(bill).reduce((sum, amount) => sum + amount, 0);

  return {
    member_id: firstMatch(text, [/member\s+id\s*[:\-]\s*([A-Z0-9_-]+)/i], "EMP_EXTRACTED"),
    member_name: firstMatch(text, [/patient\s+name\s*[:\-]\s*([^\n]+)/i, /member\s+name\s*[:\-]\s*([^\n]+)/i], ""),
    treatment_date: toIsoDate(firstMatch(text, [/date\s*[:\-]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i, /treatment\s+date\s*[:\-]\s*([0-9-]+)/i], "")),
    claim_amount: totalFromBill || billTotal,
    hospital: firstMatch(text, [/(apollo hospitals|fortis healthcare|max healthcare|manipal hospitals|narayana health)/i], ""),
    cashless_request: /cashless\s*[:\-]?\s*yes|cashless request/i.test(text),
    pre_authorization_id: firstMatch(text, [/pre-?auth(?:orization)?\s*(?:id)?\s*[:\-]\s*([A-Z0-9_-]+)/i], ""),
    documents: {
      prescription: {
        doctor_name: firstMatch(text, [/(dr\.\s*[A-Za-z .]+)/i, /doctor\s+name\s*[:\-]\s*([^\n]+)/i], ""),
        doctor_reg: firstMatch(text, [
          /reg\.?\s*(?:no\.?)?\s*[:\-]\s*([A-Z]{2,5}(?:\/[A-Z]{2})?\/\d{3,6}\/\d{4})/i,
          /registration\s*(?:no\.?)?\s*[:\-]\s*([A-Z]{2,5}(?:\/[A-Z]{2})?\/\d{3,6}\/\d{4})/i
        ], ""),
        diagnosis: firstMatch(text, [/diagnosis\s*[:\-]\s*([^\n]+)/i], ""),
        medicines_prescribed: splitList(firstMatch(text, [/medicines?\s*(?:prescribed)?\s*[:\-]\s*([^\n]+)/i, /rx\s*[:\-]\s*([^\n]+)/i], ""))
      },
      bill
    },
    uploaded_files: files.map((file) => ({
      name: file.originalname,
      type: file.mimetype,
      size: file.size
    }))
  };
}

function estimateLocalConfidence(extractedClaim, text) {
  const missingFields = JSON.stringify(extractedClaim).split(":\"\"").length - 1;
  return text.trim() ? Math.max(0.72, Math.min(0.94, 0.95 - missingFields * 0.01)) : 0.45;
}

function cleanLlmClaim(claim, fallbackClaim) {
  const bill = claim?.documents?.bill && typeof claim.documents.bill === "object"
    ? claim.documents.bill
    : fallbackClaim.documents.bill;
  const medicines = Array.isArray(claim?.documents?.prescription?.medicines_prescribed)
    ? claim.documents.prescription.medicines_prescribed
    : fallbackClaim.documents.prescription.medicines_prescribed;

  return {
    member_id: claim?.member_id || fallbackClaim.member_id,
    member_name: claim?.member_name || fallbackClaim.member_name,
    treatment_date: claim?.treatment_date || fallbackClaim.treatment_date,
    ...(claim?.member_join_date ? { member_join_date: claim.member_join_date } : {}),
    claim_amount: Number(claim?.claim_amount || fallbackClaim.claim_amount || 0),
    hospital: claim?.hospital || fallbackClaim.hospital,
    cashless_request: Boolean(claim?.cashless_request || fallbackClaim.cashless_request),
    pre_authorization_id: claim?.pre_authorization_id || fallbackClaim.pre_authorization_id,
    documents: {
      prescription: {
        doctor_name: claim?.documents?.prescription?.doctor_name || fallbackClaim.documents.prescription.doctor_name,
        doctor_reg: claim?.documents?.prescription?.doctor_reg || fallbackClaim.documents.prescription.doctor_reg,
        diagnosis: claim?.documents?.prescription?.diagnosis || fallbackClaim.documents.prescription.diagnosis,
        medicines_prescribed: medicines
      },
      bill
    },
    uploaded_files: fallbackClaim.uploaded_files
  };
}

function buildExtractionPrompt(text) {
  return `Extract a JSON object with this exact shape:
{
  "member_id": "string",
  "member_name": "string",
  "treatment_date": "YYYY-MM-DD",
  "member_join_date": "YYYY-MM-DD or empty",
  "claim_amount": number,
  "hospital": "string",
  "cashless_request": boolean,
  "pre_authorization_id": "string",
  "documents": {
    "prescription": {
      "doctor_name": "string",
      "doctor_reg": "string",
      "diagnosis": "string",
      "medicines_prescribed": ["string"]
    },
    "bill": {
      "consultation_fee": number,
      "diagnostic_tests": number,
      "medicines": number
    }
  }
}

Rules:
- Extract OPD insurance claim fields from prescription and bill text.
- Do not adjudicate the claim.
- Use empty strings for unavailable text fields.
- Use 0 for unavailable amount fields.
- Keep bill item keys snake_case and clinically meaningful.
- Convert dates to YYYY-MM-DD.
- Return only valid JSON, no markdown.

Document text:
${text}`;
}

function parseJsonText(value) {
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function buildGeminiParts({ text, files }) {
  const parts = [{ text: buildExtractionPrompt(text) }];

  for (const file of files.filter((candidate) => isGeminiReadableFile(candidate))) {
    parts.push({
      inline_data: {
        mime_type: file.mimetype,
        data: file.buffer.toString("base64")
      }
    });
  }

  return parts;
}

async function extractWithGemini({ text, files, fallbackClaim }) {
  const model = process.env.GEMINI_EXTRACTION_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: buildGeminiParts({ text, files })
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!output) throw new Error("Gemini returned no extractable text.");

  return {
    extracted_claim: cleanLlmClaim(parseJsonText(output), fallbackClaim),
    confidence_score: 0.9,
    extraction_method: "gemini_llm",
    notes: files.some((file) => isGeminiReadableFile(file))
      ? "Gemini extracted structured fields from uploaded image/PDF content; deterministic policy rules still make the adjudication decision."
      : "Gemini extracted structured fields from document text; deterministic policy rules still make the adjudication decision."
  };
}

async function extractWithOpenAI({ text, fallbackClaim }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_EXTRACTION_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "Extract OPD insurance claim fields from prescription and bill text. Return only valid JSON. Do not adjudicate the claim."
      },
      {
        role: "user",
        content: buildExtractionPrompt(text)
      }
    ],
    text: {
      format: {
        type: "json_object"
      }
    }
  });

  return {
    extracted_claim: cleanLlmClaim(parseJsonText(response.output_text), fallbackClaim),
    confidence_score: 0.9,
    extraction_method: "openai_llm",
    notes: "OpenAI extracted structured fields; deterministic policy rules still make the adjudication decision."
  };
}

export function extractClaimFromDocuments({ documentText = "", files = [] }) {
  const text = collectDocumentText({ documentText, files });
  const extractedClaim = parseClaimLocally({ text, files });

  return {
    extracted_claim: extractedClaim,
    confidence_score: Number(estimateLocalConfidence(extractedClaim, text).toFixed(2)),
    extraction_method: "local_parser",
    notes: files.some((file) => !isTextFile(file))
      ? "Image/PDF files were received. Add OCR or OpenAI Vision for full visual extraction; pasted text was parsed for this MVP."
      : "Document text parsed into structured claim fields."
  };
}

export async function extractClaimWithLlm({ documentText = "", files = [] }) {
  const text = collectDocumentText({ documentText, files });
  const fallbackClaim = parseClaimLocally({ text, files });
  const errors = [];

  if (process.env.GEMINI_API_KEY) {
    try {
      return await extractWithGemini({ text, files, fallbackClaim });
    } catch (error) {
      errors.push(`Gemini failed: ${error.message}`);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await extractWithOpenAI({ text, fallbackClaim });
    } catch (error) {
      errors.push(`OpenAI failed: ${error.message}`);
    }
  }

  return {
    extracted_claim: fallbackClaim,
    confidence_score: Number(estimateLocalConfidence(fallbackClaim, text).toFixed(2)),
    extraction_method: errors.length ? "local_parser_fallback" : "local_parser",
    notes: errors.length
      ? `${errors.join(" ")} Local parser fallback was used.`
      : "No LLM API key is configured, so local parser extraction was used."
  };
}
