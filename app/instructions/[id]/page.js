"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function InstructionsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTest() {
      const { data, error } = await supabase()
        .from("tests")
        .select(`
          id,
          title,
          total_questions,
          total_marks,
          duration_minutes,
          negative_mark,
          attempt_until,
          status
        `)
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setTest(data);
      }

      setLoading(false);
    }

    loadTest();
  }, [id]);

  if (loading) {
    return (
      <>
        <div className="nav">JD Exambook</div>
        <main className="wrap">
          <div className="card">Loading instructions...</div>
        </main>
      </>
    );
  }

  if (error || !test) {
    return (
      <>
        <div className="nav">JD Exambook</div>
        <main className="wrap">
          <div className="card">
            <b>Error:</b> {error || "Test not found"}
          </div>
        </main>
      </>
    );
  }

  function startTest() {
    if (!agree) return;
    router.push(`/test/${id}`);
  }

  return (
    <>
      <div className="nav">JD Exambook • Instructions</div>

      <main className="wrap">
        <div className="card">
          <h1>{test.title}</h1>
          <p className="muted">
            Please read all instructions carefully before starting the test.
          </p>
        </div>

        <div className="card">
          <h2>Test Details</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            <div className="card">
              <b>Total Questions</b>
              <div className="big">{test.total_questions}</div>
            </div>

            <div className="card">
              <b>Total Marks</b>
              <div className="big">{test.total_marks}</div>
            </div>

            <div className="card">
              <b>Duration</b>
              <div className="big">{test.duration_minutes}</div>
              <div className="muted">Minutes</div>
            </div>

            <div className="card">
              <b>Negative Marking</b>
              <div className="big">{test.negative_mark}</div>
              <div className="muted">Per wrong answer</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Sections</h2>

          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>Section</th>
                  <th style={cellStyle}>Questions</th>
                  <th style={cellStyle}>Marks</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td style={cellStyle}>
                    General Intelligence & Reasoning
                  </td>
                  <td style={cellStyle}>50</td>
                  <td style={cellStyle}>50</td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    General Awareness
                  </td>
                  <td style={cellStyle}>50</td>
                  <td style={cellStyle}>50</td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    English Language & Comprehension
                  </td>
                  <td style={cellStyle}>100</td>
                  <td style={cellStyle}>100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>General Instructions</h2>

          <ol
            style={{
              lineHeight: "1.8",
              paddingLeft: "22px",
            }}
          >
            <li>
              The test contains {test.total_questions} questions.
            </li>

            <li>
              Total test duration is {test.duration_minutes} minutes.
            </li>

            <li>
              Each correct answer carries 1 mark.
            </li>

            <li>
              {test.negative_mark} mark will be deducted for every wrong answer.
            </li>

            <li>
              Unattempted questions will carry no negative marks.
            </li>

            <li>
              Use Save & Next, Previous and Question Palette to move between questions.
            </li>

            <li>
              You can clear or change an answer before submission.
            </li>

            <li>
              When sectional timing is enabled, you cannot return to a completed section.
            </li>

            <li>
              The test will be submitted automatically when the final allotted time ends.
            </li>

            <li>
              Detailed solutions will be released after the configured solution-release period.
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>Question Palette Symbols</h2>

          <div style={{ lineHeight: "2" }}>
            <div>🟢 <b>Answered</b></div>
            <div>🔴 <b>Not Answered</b></div>
            <div>🟣 <b>Marked for Review</b></div>
            <div>⚪ <b>Not Visited</b></div>
          </div>
        </div>

        <div className="card">
          <label
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{
                width: "22px",
                height: "22px",
              }}
            />

            <span>
              I have read and understood all the instructions and agree to follow them.
            </span>
          </label>

          <button
            className="btn"
            disabled={!agree}
            onClick={startTest}
            style={{
              width: "100%",
              marginTop: "22px",
              opacity: agree ? 1 : 0.5,
            }}
          >
            Agree & Continue
          </button>
        </div>
      </main>
    </>
  );
}

const cellStyle = {
  border: "1px solid #d7deea",
  padding: "12px",
  textAlign: "left",
};
