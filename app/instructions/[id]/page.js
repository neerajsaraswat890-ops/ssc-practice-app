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
          <div className="card">
            Loading instructions...
          </div>
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
      <div className="nav">
        JD Exambook • Test Instructions
      </div>

      <main className="wrap">

        <div className="card">
          <h2 style={{ marginBottom: "6px" }}>
            {test.title}
          </h2>

          <p className="muted">
            SSC Stenographer Grade C & D Practice Test
          </p>
        </div>

        <div className="card">
          <h2>Test Summary</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(120px, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <div style={summaryBox}>
              <b>Total Questions</b>
              <div style={summaryValue}>
                {test.total_questions}
              </div>
            </div>

            <div style={summaryBox}>
              <b>Total Marks</b>
              <div style={summaryValue}>
                {test.total_marks}
              </div>
            </div>

            <div style={summaryBox}>
              <b>Total Duration</b>
              <div style={summaryValue}>
                120 Min
              </div>
            </div>

            <div style={summaryBox}>
              <b>Negative Marking</b>
              <div style={summaryValue}>
                {test.negative_mark}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Sectional Timing</h2>

          <p className="muted">
            Each section has a fixed time limit.
          </p>

          <div
            style={{
              overflowX: "auto",
              marginTop: "15px",
            }}
          >
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
                  <th style={cellStyle}>Time</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td style={cellStyle}>
                    General Intelligence & Reasoning
                  </td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>
                    <b>30 Min</b>
                  </td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    General Awareness
                  </td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>
                    <b>30 Min</b>
                  </td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    English Language & Comprehension
                  </td>

                  <td style={cellStyle}>100</td>

                  <td style={cellStyle}>100</td>

                  <td style={cellStyle}>
                    <b>60 Min</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Important Instructions</h2>

          <ol
            style={{
              lineHeight: "1.8",
              paddingLeft: "22px",
            }}
          >
            <li>
              The test contains 200 questions carrying
              200 marks.
            </li>

            <li>
              Total examination duration is 120 minutes.
            </li>

            <li>
              General Intelligence & Reasoning has
              50 questions with 30 minutes.
            </li>

            <li>
              General Awareness has 50 questions with
              30 minutes.
            </li>

            <li>
              English Language & Comprehension has
              100 questions with 60 minutes.
            </li>

            <li>
              Each correct answer carries 1 mark.
            </li>

            <li>
              0.25 mark will be deducted for every
              wrong answer.
            </li>

            <li>
              No marks will be deducted for
              unattempted questions.
            </li>

            <li>
              When the time of a section ends, that
              section will be locked automatically.
            </li>

            <li>
              After moving to the next section,
              you will not be allowed to return
              to the completed section.
            </li>

            <li>
              Use Save & Next, Previous and
              Question Palette to navigate within
              the active section.
            </li>

            <li>
              The test will automatically submit
              when the final section time ends.
            </li>

            <li>
              Detailed answer sheet and explanations
              will be released after the configured
              solution release period.
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>हिंदी निर्देश</h2>

          <ol
            style={{
              lineHeight: "1.8",
              paddingLeft: "22px",
            }}
          >
            <li>
              परीक्षा में कुल 200 प्रश्न होंगे।
            </li>

            <li>
              परीक्षा की कुल अवधि 120 मिनट होगी।
            </li>

            <li>
              रीजनिंग सेक्शन में 50 प्रश्न होंगे
              और 30 मिनट का समय मिलेगा।
            </li>

            <li>
              सामान्य जागरूकता सेक्शन में
              50 प्रश्न होंगे और 30 मिनट का समय मिलेगा।
            </li>

            <li>
              अंग्रेजी सेक्शन में 100 प्रश्न होंगे
              और 60 मिनट का समय मिलेगा।
            </li>

            <li>
              प्रत्येक गलत उत्तर पर 0.25 अंक
              की कटौती होगी।
            </li>

            <li>
              किसी सेक्शन का समय समाप्त होने पर
              वह सेक्शन स्वतः लॉक हो जाएगा।
            </li>

            <li>
              अगले सेक्शन में जाने के बाद पिछले
              सेक्शन में वापस नहीं जा सकेंगे।
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>Question Status</h2>

          <div style={{ lineHeight: "2.2" }}>
            <div>
              🟢 <b>Answered</b>
            </div>

            <div>
              🔴 <b>Not Answered</b>
            </div>

            <div>
              🟣 <b>Marked for Review</b>
            </div>

            <div>
              ⚪ <b>Not Visited</b>
            </div>
          </div>
        </div>

        <div className="card">
          <label
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              fontWeight: "600",
              cursor: "pointer",
              lineHeight: "1.5",
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) =>
                setAgree(e.target.checked)
              }
              style={{
                width: "22px",
                height: "22px",
                marginTop: "3px",
              }}
            />

            <span>
              I have read and understood all the
              instructions. I agree to follow the
              sectional timing rules of the examination.
            </span>
          </label>

          <button
            className="btn"
            disabled={!agree}
            onClick={startTest}
            style={{
              width: "100%",
              marginTop: "22px",
              padding: "15px",
              fontSize: "17px",
              opacity: agree ? 1 : 0.5,
            }}
          >
            Agree & Start Test
          </button>
        </div>

      </main>
    </>
  );
}

const cellStyle = {
  border: "1px solid #d7deea",
  padding: "11px",
  textAlign: "left",
  fontSize: "14px",
};

const summaryBox = {
  border: "1px solid #d7deea",
  borderRadius: "12px",
  padding: "14px",
  background: "#f8fafc",
};

const summaryValue = {
  fontSize: "25px",
  fontWeight: "800",
  marginTop: "7px",
};
