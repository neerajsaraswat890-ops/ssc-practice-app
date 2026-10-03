"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Result() {
  const { id } = useParams();
  const router = useRouter();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResult() {
      const client = supabase();

      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await client
        .from("attempts")
        .select(
          "correct_count,wrong_count,unanswered_count,score,percentage,submitted_at"
        )
        .eq("test_id", id)
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setResult(data);
      }

      setLoading(false);
    }

    loadResult();
  }, [id, router]);

  if (loading) {
    return (
      <>
        <div className="nav">SSC Practice • Result</div>
        <main className="wrap">
          <div className="card">Loading result...</div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="nav">SSC Practice • Result</div>
        <main className="wrap">
          <div className="card">
            <h2>Result Error</h2>
            <p>{error}</p>
          </div>
        </main>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <div className="nav">SSC Practice • Result</div>
        <main className="wrap">
          <div className="card">
            <h2>Result not found</h2>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="nav">SSC Practice • Result</div>

      <main className="wrap">
        <div className="card">
          <h1>Test Submitted ✅</h1>
          <p className="muted">Your result has been calculated successfully.</p>

          <div className="grid">
            <div className="card">
              <h3>Correct</h3>
              <div className="big">{result.correct_count}</div>
            </div>

            <div className="card">
              <h3>Wrong</h3>
              <div className="big">{result.wrong_count}</div>
            </div>

            <div className="card">
              <h3>Unattempted</h3>
              <div className="big">{result.unanswered_count}</div>
            </div>

            <div className="card">
              <h3>Score</h3>
              <div className="big">{Number(result.score).toFixed(2)}</div>
              <p className="muted">0.25 negative marking applied</p>
            </div>

            <div className="card">
              <h3>Percentage</h3>
              <div className="big">
                {Number(result.percentage).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="lock">
            <h3>🔒 Detailed Answer Sheet</h3>
            <p>
              Correct answers, explanations and detailed solutions will unlock
              after 48 hours.
            </p>
          </div>

          <br />

          <button
            className="btn"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </>
  );
}
