import { Activity, ClipboardCheck, FileInput, History } from "lucide-react";
import { useState } from "react";
import ClaimHistory from "./pages/ClaimHistory.jsx";
import SubmitClaim from "./pages/SubmitClaim.jsx";
import TestCases from "./pages/TestCases.jsx";

const tabs = [
  { id: "submit", label: "Submit Claim", icon: FileInput },
  { id: "tests", label: "Test Cases", icon: ClipboardCheck },
  { id: "history", label: "History", icon: History }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("submit");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Activity size={24} />
          </div>
          <div>
            <h1>Plum OPD</h1>
            <p>Claim adjudication workspace</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "nav-item active" : "nav-item"}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-panel">
        {activeTab === "submit" && <SubmitClaim />}
        {activeTab === "tests" && <TestCases />}
        {activeTab === "history" && <ClaimHistory />}
      </main>
    </div>
  );
}
