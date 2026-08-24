import { SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND } from "../../server/sarah-v1-demo-command";
import { SarahResultShell } from "../../ui/features/ask/sarah-result-shell";

export default function AskBoundaryProofPage() {
  return (
    <main className="app-frame">
      <header className="product-header">
        <div className="brand-mark" aria-hidden="true">
          FY
        </div>
        <div>
          <p className="eyebrow">Future You</p>
          <h1>If I do this today, what happens to my future?</h1>
          <p>
            Slice 2 boundary proof: the browser renders server-produced facts without importing or
            running the financial simulator.
          </p>
        </div>
      </header>
      <SarahResultShell command={SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND} />
    </main>
  );
}
