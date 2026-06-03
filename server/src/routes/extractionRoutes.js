import express from "express";
import multer from "multer";
import { extractClaimWithLlm } from "../services/extractionService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.array("documents"), async (req, res) => {
  try {
    const result = await extractClaimWithLlm({
      documentText: req.body.documentText || "",
      files: req.files || []
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
