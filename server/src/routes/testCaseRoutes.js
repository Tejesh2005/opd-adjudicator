import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { adjudicateClaim } from "../services/adjudicationEngine.js";

const router = express.Router();
const testCasePath = fileURLToPath(new URL("../data/test_cases.json", import.meta.url));
const testCases = JSON.parse(readFileSync(testCasePath, "utf8"));

function compareExpected(actual, expected) {
  const failures = [];
  if (actual.decision !== expected.decision) failures.push(`decision expected ${expected.decision}, got ${actual.decision}`);
  if (expected.approved_amount !== undefined && actual.approved_amount !== expected.approved_amount) {
    failures.push(`approved_amount expected ${expected.approved_amount}, got ${actual.approved_amount}`);
  }
  if (expected.rejection_reasons) {
    for (const reason of expected.rejection_reasons) {
      if (!actual.rejection_reasons.includes(reason)) failures.push(`missing rejection reason ${reason}`);
    }
  }
  if (expected.rejected_items) {
    for (const item of expected.rejected_items) {
      if (!actual.rejected_items.includes(item)) failures.push(`missing rejected item ${item}`);
    }
  }
  if (expected.flags) {
    for (const flag of expected.flags) {
      if (!actual.flags.includes(flag)) failures.push(`missing flag ${flag}`);
    }
  }
  if (expected.cashless_approved !== undefined && actual.cashless_approved !== expected.cashless_approved) {
    failures.push(`cashless_approved expected ${expected.cashless_approved}, got ${actual.cashless_approved}`);
  }
  if (expected.network_discount !== undefined && actual.network_discount !== expected.network_discount) {
    failures.push(`network_discount expected ${expected.network_discount}, got ${actual.network_discount}`);
  }
  return failures;
}

export function runAllTestCases() {
  const results = testCases.test_cases.map((testCase) => {
    const actual = adjudicateClaim({ ...testCase.input_data, case_id: testCase.case_id });
    const failures = compareExpected(actual, testCase.expected_output);
    return {
      case_id: testCase.case_id,
      case_name: testCase.case_name,
      expected: testCase.expected_output,
      actual,
      passed: failures.length === 0,
      failures
    };
  });

  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results
  };
}

router.get("/", (_req, res) => {
  res.json(testCases);
});

router.post("/run", (_req, res) => {
  res.json(runAllTestCases());
});

export default router;
