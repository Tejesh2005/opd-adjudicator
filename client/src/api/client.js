const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}

export function submitClaim(claim) {
  return request("/claims", {
    method: "POST",
    body: JSON.stringify(claim)
  });
}

export async function extractDocuments({ documentText, files }) {
  const formData = new FormData();
  formData.append("documentText", documentText || "");
  for (const file of files || []) {
    formData.append("documents", file);
  }

  const response = await fetch(`${API_BASE_URL}/extraction`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Extraction failed" }));
    throw new Error(error.message || "Extraction failed");
  }

  return response.json();
}

export function listClaims() {
  return request("/claims");
}

export function runTestCases() {
  return request("/test-cases/run", { method: "POST" });
}
