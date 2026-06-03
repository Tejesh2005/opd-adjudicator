import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const policyPath = fileURLToPath(new URL("../data/policy_terms.json", import.meta.url));
const policy = JSON.parse(readFileSync(policyPath, "utf8"));

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  return Math.floor((new Date(`${endDate}T00:00:00.000Z`) - new Date(`${startDate}T00:00:00.000Z`)) / DAY_MS);
}

function hasDocuments(claim) {
  return Boolean(claim.documents?.prescription && claim.documents?.bill);
}

function isDoctorRegistrationValid(registrationNumber = "") {
  return /^[A-Z]{2,5}(\/[A-Z]{2})?\/\d{3,6}\/\d{4}$/.test(registrationNumber.trim().toUpperCase());
}

function textFromClaim(claim) {
  return JSON.stringify(claim).toLowerCase();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function getBillItems(claim) {
  return Object.entries(claim.documents?.bill || {})
    .filter(([, value]) => typeof value === "number")
    .map(([key, amount]) => ({ key, amount }));
}

function addRule(ruleResults, name, passed, message) {
  ruleResults.push({ name, passed, message });
}

function makeDecision(overrides) {
  return {
    claim_id: overrides.claim_id || `CLM_${nanoid(8).toUpperCase()}`,
    decision: overrides.decision,
    approved_amount: overrides.approved_amount || 0,
    rejection_reasons: overrides.rejection_reasons || [],
    deductions: overrides.deductions || {},
    rejected_items: overrides.rejected_items || [],
    flags: overrides.flags || [],
    confidence_score: overrides.confidence_score,
    notes: overrides.notes || "",
    next_steps: overrides.next_steps || "",
    cashless_approved: overrides.cashless_approved || false,
    network_discount: overrides.network_discount || 0,
    rule_results: overrides.rule_results || []
  };
}

function detectCategory(claim) {
  const text = textFromClaim(claim);
  if (includesAny(text, ["root canal", "filling", "extraction", "cleaning", "teeth", "dental"])) return "dental";
  if (includesAny(text, ["ayurveda", "panchakarma", "homeopathy", "unani", "vaidya"])) return "alternative_medicine";
  if (includesAny(text, ["mri", "ct scan", "cbc", "dengue", "blood test", "x-ray", "ecg", "ultrasound"])) return "diagnostic_tests";
  if (includesAny(text, ["medicine", "medicines", "pharmacy", "tablet", "tab.", "syrup"])) return "pharmacy";
  return "consultation_fees";
}

export function adjudicateClaim(inputClaim) {
  const claim = structuredClone(inputClaim);
  const ruleResults = [];
  const claimId = claim.claim_id || claim.case_id || `CLM_${nanoid(8).toUpperCase()}`;
  const text = textFromClaim(claim);
  const claimAmount = Number(claim.claim_amount || 0);

  addRule(ruleResults, "Policy active", claim.treatment_date >= policy.effective_date, "Policy must be active on treatment date.");
  if (claim.treatment_date < policy.effective_date) {
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["POLICY_INACTIVE"],
      confidence_score: 0.99,
      notes: "Treatment date is before policy effective date.",
      next_steps: "Submit claims only for active policy dates.",
      rule_results: ruleResults
    });
  }

  if (claim.previous_claims_same_day >= 3 || claimAmount > 25000) {
    addRule(ruleResults, "Fraud/manual review screen", false, "Unusual pattern requires human review.");
    return makeDecision({
      claim_id: claimId,
      decision: "MANUAL_REVIEW",
      flags: ["Multiple claims same day", "Unusual pattern detected"],
      confidence_score: 0.65,
      notes: "Claim pattern needs manual verification before payment.",
      next_steps: "Claims team should review provider, bill sequence, and duplicate history.",
      rule_results: ruleResults
    });
  }

  const hasRequiredDocuments = hasDocuments(claim);
  addRule(ruleResults, "Required documents", hasRequiredDocuments, "Prescription and bill are mandatory.");
  if (!hasRequiredDocuments) {
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["MISSING_DOCUMENTS"],
      confidence_score: 1,
      notes: "Prescription from registered doctor is required",
      next_steps: "Upload the missing prescription and resubmit.",
      rule_results: ruleResults
    });
  }

  const doctorReg = claim.documents?.prescription?.doctor_reg || "";
  const validReg = isDoctorRegistrationValid(doctorReg);
  addRule(ruleResults, "Doctor registration", validReg, "Doctor registration must match a valid council format.");
  if (!validReg) {
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["DOCTOR_REG_INVALID"],
      confidence_score: 0.98,
      notes: "Doctor registration number is missing or invalid.",
      next_steps: "Submit a prescription with the doctor's registration number visible.",
      rule_results: ruleResults
    });
  }

  if (claim.submission_date && claim.treatment_date) {
    const submissionLag = daysBetween(claim.treatment_date, claim.submission_date);
    const onTime = submissionLag <= policy.claim_requirements.submission_timeline_days;
    addRule(ruleResults, "Submission timeline", onTime, "Claim must be submitted within 30 days.");
    if (!onTime) {
      return makeDecision({
        claim_id: claimId,
        decision: "REJECTED",
        rejection_reasons: ["LATE_SUBMISSION"],
        confidence_score: 0.99,
        notes: "Claim was submitted after the 30-day deadline.",
        next_steps: "Contact support if there is a valid delay reason.",
        rule_results: ruleResults
      });
    }
  }

  const meetsMinimum = claimAmount >= policy.claim_requirements.minimum_claim_amount;
  addRule(ruleResults, "Minimum claim amount", meetsMinimum, "Claim must be at least Rs 500.");
  if (!meetsMinimum) {
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["BELOW_MIN_AMOUNT"],
      confidence_score: 0.99,
      notes: "Claim is below the minimum amount of Rs 500.",
      next_steps: "Combine eligible bills where policy permits.",
      rule_results: ruleResults
    });
  }

  if (claim.member_join_date && includesAny(text, ["diabetes", "hypertension"])) {
    const ailment = text.includes("diabetes") ? "diabetes" : "hypertension";
    const requiredDays = policy.waiting_periods.specific_ailments[ailment];
    const elapsedDays = daysBetween(claim.member_join_date, claim.treatment_date);
    const waitingSatisfied = elapsedDays >= requiredDays;
    addRule(ruleResults, "Waiting period", waitingSatisfied, `${ailment} requires ${requiredDays} days waiting period.`);
    if (!waitingSatisfied) {
      const eligibleFrom = addDays(claim.member_join_date, requiredDays);
      return makeDecision({
        claim_id: claimId,
        decision: "REJECTED",
        rejection_reasons: ["WAITING_PERIOD"],
        confidence_score: 0.96,
        notes: `${ailment[0].toUpperCase() + ailment.slice(1)} has ${requiredDays}-day waiting period. Eligible from ${eligibleFrom}`,
        next_steps: "Resubmit treatment expenses incurred after the waiting period.",
        rule_results: ruleResults
      });
    }
  }

  if (includesAny(text, ["weight loss", "obesity", "bariatric", "diet plan"])) {
    addRule(ruleResults, "Coverage exclusion", false, "Weight loss treatment is excluded.");
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["SERVICE_NOT_COVERED"],
      confidence_score: 0.97,
      notes: "Weight loss treatments are excluded from coverage",
      next_steps: "No reimbursement is available for this excluded service.",
      rule_results: ruleResults
    });
  }

  if (includesAny(text, ["mri"]) && !claim.pre_authorization_id && claimAmount > 10000) {
    addRule(ruleResults, "Pre-authorization", false, "MRI above Rs 10000 requires pre-authorization.");
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["PRE_AUTH_MISSING"],
      confidence_score: 0.94,
      notes: "MRI requires pre-authorization for claims above Rs 10000",
      next_steps: "Attach pre-authorization approval and resubmit.",
      rule_results: ruleResults
    });
  }

  if (includesAny(text, ["teeth whitening", "cosmetic"])) {
    const bill = claim.documents.bill || {};
    const approvedAmount = Number(bill.root_canal || bill.filling || bill.extraction || bill.cleaning || 0);
    const underDentalLimit = approvedAmount <= policy.coverage_details.dental.sub_limit;
    addRule(ruleResults, "Dental covered portion", approvedAmount > 0 && underDentalLimit, "Covered dental procedures can be partially approved.");
    return makeDecision({
      claim_id: claimId,
      decision: "PARTIAL",
      approved_amount: approvedAmount,
      rejected_items: ["Teeth whitening - cosmetic procedure"],
      confidence_score: 0.92,
      notes: "Covered dental treatment approved; cosmetic procedure excluded.",
      next_steps: "Claimant can appeal only with clinical justification for rejected cosmetic item.",
      rule_results: ruleResults
    });
  }

  const category = detectCategory(claim);
  addRule(ruleResults, "Coverage category", true, `Detected category: ${category}.`);

  if (claimAmount > policy.coverage_details.per_claim_limit) {
    addRule(ruleResults, "Per-claim limit", false, `Limit is Rs ${policy.coverage_details.per_claim_limit}.`);
    return makeDecision({
      claim_id: claimId,
      decision: "REJECTED",
      rejection_reasons: ["PER_CLAIM_EXCEEDED"],
      confidence_score: 0.98,
      notes: `Claim amount exceeds per-claim limit of Rs ${policy.coverage_details.per_claim_limit}`,
      next_steps: "Submit only claims within the per-claim limit unless partial approval applies.",
      rule_results: ruleResults
    });
  }

  const networkHospital = policy.network_hospitals.includes(claim.hospital);
  if (claim.cashless_request && networkHospital && claimAmount <= policy.cashless_facilities.instant_approval_limit) {
    const discount = Math.round(claimAmount * (policy.coverage_details.consultation_fees.network_discount / 100));
    addRule(ruleResults, "Network cashless", true, "Network provider and amount eligible for instant approval.");
    return makeDecision({
      claim_id: claimId,
      decision: "APPROVED",
      approved_amount: claimAmount - discount,
      confidence_score: 0.93,
      cashless_approved: true,
      network_discount: discount,
      notes: "Network hospital cashless request approved.",
      next_steps: "Proceed with cashless settlement at the network provider.",
      rule_results: ruleResults
    });
  }

  if (category === "alternative_medicine") {
    const underLimit = claimAmount <= policy.coverage_details.alternative_medicine.sub_limit;
    addRule(ruleResults, "Alternative medicine limit", underLimit, "Ayurveda/Homeopathy/Unani are covered within sub-limit.");
    return makeDecision({
      claim_id: claimId,
      decision: underLimit ? "APPROVED" : "REJECTED",
      approved_amount: underLimit ? claimAmount : 0,
      rejection_reasons: underLimit ? [] : ["SUB_LIMIT_EXCEEDED"],
      confidence_score: 0.89,
      notes: underLimit ? "Alternative medicine covered under policy" : "Alternative medicine sub-limit exceeded.",
      next_steps: underLimit ? "Claim can be processed for reimbursement." : "Submit bills within the category sub-limit.",
      rule_results: ruleResults
    });
  }

  const items = getBillItems(claim);
  const consultationAmount = items.reduce((sum, item) => sum + item.amount, 0) || claimAmount;
  const copay = Math.round(consultationAmount * (policy.coverage_details.consultation_fees.copay_percentage / 100));
  addRule(ruleResults, "Co-pay calculation", true, "Standard OPD consultation co-pay applied.");

  return makeDecision({
    claim_id: claimId,
    decision: "APPROVED",
    approved_amount: consultationAmount - copay,
    deductions: { copay },
    confidence_score: 0.95,
    notes: "Claim satisfies policy, document, coverage, and limit checks.",
    next_steps: "Claim can be processed for reimbursement.",
    rule_results: ruleResults
  });
}
