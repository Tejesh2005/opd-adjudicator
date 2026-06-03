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
