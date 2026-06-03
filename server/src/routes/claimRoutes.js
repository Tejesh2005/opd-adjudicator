import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { nanoid } from "nanoid";
import Claim from "../models/Claim.js";
import Decision from "../models/Decision.js";
import { adjudicateClaim } from "../services/adjudicationEngine.js";
import { buildUploadPlaceholder, normalizeClaimPayload } from "../services/extractionService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function databaseEnabled() {
  return mongoose.connection.readyState === 1;
}

router.post("/", upload.array("documents"), async (req, res) => {
  try {
    const rawClaim = req.files?.length ? buildUploadPlaceholder({ body: req.body, files: req.files }) : normalizeClaimPayload(req.body);
    const decision = adjudicateClaim(rawClaim);
    const claimId = decision.claim_id || `CLM_${nanoid(8).toUpperCase()}`;

    const response = {
      claim: {
        claimId,
        memberId: rawClaim.member_id,
        memberName: rawClaim.member_name,
        treatmentDate: rawClaim.treatment_date,
        claimAmount: rawClaim.claim_amount,
        rawInput: rawClaim,
        decision,
        status: decision.decision
      },
      decision
    };

    if (databaseEnabled()) {
      await Claim.create(response.claim);
      await Decision.create({
        claimId,
        decision: decision.decision,
        approvedAmount: decision.approved_amount,
        rejectionReasons: decision.rejection_reasons,
        confidenceScore: decision.confidence_score,
        notes: decision.notes,
        nextSteps: decision.next_steps,
        ruleResults: decision.rule_results,
        rawDecision: decision
      });
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (_req, res) => {
  if (!databaseEnabled()) {
    return res.json([]);
  }

  const claims = await Claim.find().sort({ createdAt: -1 }).lean();
  res.json(claims);
});

router.get("/:claimId", async (req, res) => {
  if (!databaseEnabled()) {
    return res.status(404).json({ message: "MongoDB is not connected, so persisted claims are unavailable." });
  }

  const claim = await Claim.findOne({ claimId: req.params.claimId }).lean();
  if (!claim) return res.status(404).json({ message: "Claim not found" });
  res.json(claim);
});

router.post("/:claimId/adjudicate", async (req, res) => {
  const rawClaim = normalizeClaimPayload(req.body);
  const decision = adjudicateClaim({ ...rawClaim, claim_id: req.params.claimId });
  res.json(decision);
});

export default router;
