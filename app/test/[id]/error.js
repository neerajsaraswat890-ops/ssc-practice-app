"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TestError({ error, reset }) {
  useEffect(() => {
    console.error("JD Exambook test page error:", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f8fafc", color: "#111827" }}>
      <section role="alert" style={{ maxWidth: 520, width: "100%", padding: 24, border: "1px solid #e2e8f0", borderRadius: 14, background: "white" }}>
        <h1 style={{ fontSize: 22 }}>Test could not be displayed / टेस्ट नहीं खुल सका</h1>
        <p>There was a problem loading the test. Your submitted answers have not been changed.</p>
        <p>टेस्ट खोलने में समस्या हुई। पहले से जमा किए गए उत्तरों में कोई बदलाव नहीं किया गया है।</p>
        {error?.digest && <p style={{ fontSize: 12, color: "#64748b" }}>Reference: {error.digest}</p>}
        <button onClick={() => reset()} style={{ padding: "12px 18px", background: "#0866c2", border: 0, color: "white", borderRadius: 8, cursor: "pointer" }}>Retry / फिर प्रयास करें</button>
        <p><Link href="/dashboard">Back to Dashboard / डैशबोर्ड पर जाएँ</Link></p>
      </section>
    </main>
  );
}
