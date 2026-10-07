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
        JD Exambook • Test Instructions / परीक्षा निर्देश
      </div>

      <main className="wrap">

        <div className="card">
          <h2 style={{ marginBottom: "6px" }}>
            {test.title}
          </h2>

          <p className="muted">
            SSC Stenographer Grade C & D Practice Test
          </p>

          <p style={{ fontWeight: "600" }}>
            परीक्षा प्रारम्भ करने से पहले सभी निर्देश ध्यानपूर्वक पढ़ें।
          </p>
        </div>

        <div className="card">
          <h2>
            Test Summary / परीक्षा विवरण
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(125px, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <div style={summaryBox}>
              <b>Total Questions</b>

              <div style={summaryValue}>
                {test.total_questions || 200}
              </div>

              <div className="muted">
                कुल प्रश्न
              </div>
            </div>

            <div style={summaryBox}>
              <b>Total Marks</b>

              <div style={summaryValue}>
                {test.total_marks || 200}
              </div>

              <div className="muted">
                कुल अंक
              </div>
            </div>

            <div style={summaryBox}>
              <b>Total Duration</b>

              <div style={summaryValue}>
                120 Min
              </div>

              <div className="muted">
                कुल समय
              </div>
            </div>

            <div style={summaryBox}>
              <b>Negative Marking</b>

              <div style={summaryValue}>
                {test.negative_mark ?? 0.25}
              </div>

              <div className="muted">
                प्रत्येक गलत उत्तर पर
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            Sectional Timing / अनुभागीय समय
          </h2>

          <p>
            Each section has a separate compulsory time limit.
          </p>

          <p style={{ fontWeight: "600" }}>
            प्रत्येक अनुभाग के लिए अलग निर्धारित समय होगा।
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
                minWidth: "620px",
              }}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>
                    Section / अनुभाग
                  </th>

                  <th style={cellStyle}>
                    Questions / प्रश्न
                  </th>

                  <th style={cellStyle}>
                    Marks / अंक
                  </th>

                  <th style={cellStyle}>
                    Time / समय
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td style={cellStyle}>
                    General Intelligence & Reasoning
                    <br />
                    <b>
                      सामान्य बुद्धिमत्ता एवं तर्कशक्ति
                    </b>
                  </td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>
                    <b>30 Minutes</b>
                    <br />
                    30 मिनट
                  </td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    General Awareness
                    <br />
                    <b>
                      सामान्य जागरूकता
                    </b>
                  </td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>50</td>

                  <td style={cellStyle}>
                    <b>30 Minutes</b>
                    <br />
                    30 मिनट
                  </td>
                </tr>

                <tr>
                  <td style={cellStyle}>
                    English Language & Comprehension
                    <br />
                    <b>
                      अंग्रेजी भाषा एवं बोधगम्यता
                    </b>
                  </td>

                  <td style={cellStyle}>100</td>

                  <td style={cellStyle}>100</td>

                  <td style={cellStyle}>
                    <b>60 Minutes</b>
                    <br />
                    60 मिनट
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>
            General Instructions
          </h2>

          <ol style={instructionList}>
            <li>
              The examination contains 200 objective multiple-choice questions.
            </li>

            <li>
              The total duration of the examination is 120 minutes.
            </li>

            <li>
              General Intelligence & Reasoning contains 50 questions and must be completed within 30 minutes.
            </li>

            <li>
              General Awareness contains 50 questions and must be completed within 30 minutes.
            </li>

            <li>
              English Language & Comprehension contains 100 questions and must be completed within 60 minutes.
            </li>

            <li>
              Each correct answer carries 1 mark.
            </li>

            <li>
              0.25 mark will be deducted for every wrong answer.
            </li>

            <li>
              There is no negative marking for an unattempted question.
            </li>

            <li>
              A section will automatically lock when its allotted time ends.
            </li>

            <li>
              After a section is completed or its time expires, you cannot return to that section.
            </li>

            <li>
              You may move between questions only within the currently active section.
            </li>

            <li>
              Use Save & Next to save your response and move forward. Use Previous to return to an earlier question within the active section.
            </li>

            <li>
              Use Clear Response to remove an answer, Mark for Review to revisit a question, and note that the test will automatically submit when the final section time ends.
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>
            सामान्य निर्देश
          </h2>

          <ol style={instructionList}>
            <li>
              परीक्षा में कुल 200 वस्तुनिष्ठ बहुविकल्पीय प्रश्न होंगे।
            </li>

            <li>
              परीक्षा की कुल अवधि 120 मिनट होगी।
            </li>

            <li>
              सामान्य बुद्धिमत्ता एवं तर्कशक्ति अनुभाग में 50 प्रश्न होंगे तथा इसे 30 मिनट में पूरा करना होगा।
            </li>

            <li>
              सामान्य जागरूकता अनुभाग में 50 प्रश्न होंगे तथा इसे 30 मिनट में पूरा करना होगा।
            </li>

            <li>
              अंग्रेजी भाषा एवं बोधगम्यता अनुभाग में 100 प्रश्न होंगे तथा इसे 60 मिनट में पूरा करना होगा।
            </li>

            <li>
              प्रत्येक सही उत्तर के लिए 1 अंक प्रदान किया जाएगा।
            </li>

            <li>
              प्रत्येक गलत उत्तर के लिए 0.25 अंक की कटौती की जाएगी।
            </li>

            <li>
              बिना उत्तर दिए गए प्रश्न पर कोई ऋणात्मक अंक नहीं काटा जाएगा।
            </li>

            <li>
              किसी अनुभाग का निर्धारित समय समाप्त होते ही वह अनुभाग स्वतः लॉक हो जाएगा।
            </li>

            <li>
              किसी अनुभाग का समय समाप्त होने या उसे पूरा करने के बाद आप उस अनुभाग में वापस नहीं जा सकेंगे।
            </li>

            <li>
              आप केवल वर्तमान सक्रिय अनुभाग के प्रश्नों के बीच ही जा सकेंगे।
            </li>

            <li>
              उत्तर सुरक्षित करके अगले प्रश्न पर जाने के लिए Save & Next तथा सक्रिय अनुभाग के पिछले प्रश्न पर जाने के लिए Previous का प्रयोग करें।
            </li>

            <li>
              चयनित उत्तर हटाने के लिए Clear Response, प्रश्न को पुनः देखने हेतु Mark for Review का प्रयोग करें तथा अंतिम अनुभाग का समय समाप्त होते ही पूरा टेस्ट स्वतः submit हो जाएगा।
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>
            Question Status / प्रश्न स्थिति
          </h2>

          <div
            style={{
              lineHeight: "2.1",
            }}
          >
            <div>
              🟢 <b>
                Answered / उत्तर दिया गया
              </b>
            </div>

            <div>
              🔴 <b>
                Not Answered / उत्तर नहीं दिया गया
              </b>
            </div>

            <div>
              🟣 <b>
                Marked for Review / समीक्षा हेतु चिन्हित
              </b>
            </div>

            <div>
              ⚪ <b>
                Not Visited / अभी नहीं देखा गया
              </b>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            Declaration / घोषणा
          </h2>

          <label
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              fontWeight: "600",
              lineHeight: "1.6",
              cursor: "pointer",
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
              I have read and understood all the instructions and agree to follow the examination and sectional timing rules.
              <br />
              <br />
              मैंने उपरोक्त सभी निर्देश पढ़ एवं समझ लिए हैं तथा मैं परीक्षा एवं अनुभागीय समय संबंधी नियमों का पालन करने के लिए सहमत हूँ।
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
            <br />
            सहमत हूँ एवं परीक्षा प्रारम्भ करें
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
  verticalAlign: "top",
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

const instructionList = {
  lineHeight: "1.85",
  paddingLeft: "22px",
};
