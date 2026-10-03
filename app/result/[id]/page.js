"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Result() {
  const { id } = useParams();
  const router = useRouter();

  const [result, setResult] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solutionStatus, setSolutionStatus] = useState("checking");
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

      // Load submitted test result
      const { data: attempt, error: attemptError } = await client
        .from("attempts")
        .select(
          "id, correct_count, wrong_count, unanswered_count, score, percentage, submitted_at"
        )
        .eq("test_id", Number(id))
        .eq("user_id", user.id)
        .eq("status", "submitted")
        .maybeSingle();

      if (attemptError) {
        setError(attemptError.message);
        setLoading(false);
        return;
      }

      if (!attempt) {
        setError("No submitted result found for this test.");
        setLoading(false);
        return;
      }

      setResult(attempt);

      // Try to load detailed solutions.
      // Supabase function itself decides whether 48 hours are complete.
      const { data: solutionData, error: solutionError } =
        await client.rpc("get_test_solutions", {
          p_test_id: Number(id),
        });

      if (solutionError) {
        const message = (solutionError.message || "").toLowerCase();

        if (
          message.includes("not released") ||
          message.includes("locked") ||
          message.includes("release")
        ) {
          setSolutionStatus("locked");
        } else {
          setSolutionStatus("locked");
        }
      } else if (solutionData && solutionData.length > 0) {
        setSolutions(solutionData);
        setSolutionStatus("unlocked");
      } else {
        setSolutionStatus("locked");
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
          <div className="card">
            <h2>Loading result...</h2>
          </div>
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

  return (
    <>
      <div className="nav">SSC Practice • Result</div>

      <main className="wrap">
        <div className="card">
          <h1>Test Submitted ✅</h1>
          <p className="muted">
            Your result has been calculated successfully.
          </p>

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
              <div className="big">
                {Number(result.score).toFixed(2)}
              </div>
              <p className="muted">0.25 negative marking applied</p>
            </div>

            <div className="card">
              <h3>Percentage</h3>
              <div className="big">
                {Number(result.percentage).toFixed(2)}%
              </div>
            </div>
          </div>

          {solutionStatus === "locked" && (
            <div className="lock">
              <h2>🔒 Detailed Answer Sheet</h2>
              <p>
                Correct answers, your answers and explanations will
                automatically unlock after 48 hours.
              </p>
            </div>
          )}

          {solutionStatus === "unlocked" && (
            <div style={{ marginTop: "25px" }}>
              <h2>🔓 Detailed Answer Sheet</h2>

              {solutions.map((item, index) => (
                <div className="card" key={item.question_id || index}>
                  <h3>
                    Question {item.question_order || index + 1}
                  </h3>

                  <p>
                    <strong>{item.question_text}</strong>
                  </p>

                  <p>
                    Your Answer:{" "}
                    <strong>
                      {item.selected_answer || "Not Attempted"}
                    </strong>
                  </p>

                  <p>
                    Correct Answer:{" "}
                    <strong>{item.correct_answer}</strong>
                  </p>

                  {item.explanation && (
                    <p>
                      <strong>Explanation:</strong>{" "}
                      {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "22px" }}>
            <button
              className="btn"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
