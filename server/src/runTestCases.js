import { runAllTestCases } from "./routes/testCaseRoutes.js";

const summary = runAllTestCases();
console.table(summary.results.map((result) => ({
  case: result.case_id,
  name: result.case_name,
  passed: result.passed,
  failures: result.failures.join("; ")
})));

console.log(`\n${summary.passed}/${summary.total} test cases passed.`);
if (summary.failed > 0) process.exit(1);
