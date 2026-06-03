import mongoose from "mongoose";

const decisionSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, index: true },
    decision: String,
    approvedAmount: Number,
    rejectionReasons: [String],
    confidenceScore: Number,
    notes: String,
    nextSteps: String,
    ruleResults: [mongoose.Schema.Types.Mixed],
    rawDecision: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export default mongoose.model("Decision", decisionSchema);
