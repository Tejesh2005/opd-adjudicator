import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, unique: true },
    memberId: String,
    memberName: String,
    treatmentDate: String,
    claimAmount: Number,
    rawInput: mongoose.Schema.Types.Mixed,
    documents: mongoose.Schema.Types.Mixed,
    extractedData: mongoose.Schema.Types.Mixed,
    decision: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["SUBMITTED", "APPROVED", "REJECTED", "PARTIAL", "MANUAL_REVIEW"],
      default: "SUBMITTED"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Claim", claimSchema);
