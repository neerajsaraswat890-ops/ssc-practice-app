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
  const [language, setLanguage] = useState("english");
  const [error, setError] = useState("");

  const languageKey = `jd_language_${id}`;

  useEffect(() => {
    async function loadTest() {
      try {
        const savedLanguage =
          localStorage.getItem(languageKey);

        if (
          savedLanguage === "english" ||
          savedLanguage === "hindi"
        ) {
          setLanguage(savedLanguage);
        }
      } catch {
        // Ignore localStorage error
      }

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

  function changeLanguage(value) {
    setLanguage(value);

    try {
      localStorage.setItem(
        languageKey,
        value
      );
    } catch {
      // Ignore localStorage error
    }
  }

  function startTest() {
    if (!agree) return;

    try {
      localStorage.setItem(
        languageKey,
        language
      );
    } catch {
      // Ignore localStorage error
    }

    router.push(`/test/${id}`);
  }

  if (loading) {
    return (
      <>
        <div className="nav">
          JD Exambook
        </div>

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
        <div className="nav">
          JD Exambook
        </div>

        <main className="wrap">
          <div className="card">
            <b>Error:</b>{" "}
            {error || "Test not found"}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="nav">
        JD Exambook • Test Instructions
      </div>

      <main className="wrap">

        {/* TEST TITLE */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            {test.title}
          </h2>

          <p className="muted">
            SSC Stenographer Grade C & D Practice Test
          </p>

          <p
            style={{
              lineHeight: "1.6",
            }}
          >
            परीक्षा प्रारम्भ करने से पहले सभी निर्देश ध्यानपूर्वक पढ़ें।
          </p>
        </div>

        {/* TEST SUMMARY */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Test Summary / परीक्षा विवरण
          </h2>

          <div style={summaryGrid}>

            <SummaryBox
              title="Total Questions"
              hindi="कुल प्रश्न"
              value={
                test.total_questions || 200
              }
            />

            <SummaryBox
              title="Total Marks"
              hindi="कुल अंक"
              value={
                test.total_marks || 200
              }
            />

            <SummaryBox
              title="Duration"
              hindi="कुल समय"
              value={`${test.duration_minutes || 120} Min`}
            />

            <SummaryBox
              title="Negative Marking"
              hindi="गलत उत्तर पर कटौती"
              value={
                test.negative_mark ?? 0.25
              }
            />

          </div>
        </div>

        {/* SECTIONAL TIMING */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Sectional Timing / अनुभागीय समय
          </h2>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={cellStyle}>
                    Section / अनुभाग
                  </th>

                  <th style={cellStyle}>
                    Questions
                  </th>

                  <th style={cellStyle}>
                    Marks
                  </th>

                  <th style={cellStyle}>
                    Time
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

                  <td style={cellStyle}>
                    50
                  </td>

                  <td style={cellStyle}>
                    50
                  </td>

                  <td style={cellStyle}>
                    30 Min
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

                  <td style={cellStyle}>
                    50
                  </td>

                  <td style={cellStyle}>
                    50
                  </td>

                  <td style={cellStyle}>
                    30 Min
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

                  <td style={cellStyle}>
                    100
                  </td>

                  <td style={cellStyle}>
                    100
                  </td>

                  <td style={cellStyle}>
                    60 Min
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* ENGLISH INSTRUCTIONS */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            General Instructions
          </h2>

          <ol style={instructionList}>
            <li>
              The examination contains 200 objective multiple-choice questions.
            </li>

            <li>
              The total examination duration is 120 minutes.
            </li>

            <li>
              Reasoning contains 50 questions with a 30-minute sectional timer.
            </li>

            <li>
              General Awareness contains 50 questions with a 30-minute sectional timer.
            </li>

            <li>
              English Language & Comprehension contains 100 questions with a 60-minute sectional timer.
            </li>

            <li>
              Each correct answer carries 1 mark.
            </li>

            <li>
              0.25 mark will be deducted for every wrong answer.
            </li>

            <li>
              No negative mark will be deducted for an unattempted question.
            </li>

            <li>
              A section will automatically lock when its allotted time expires.
            </li>

            <li>
              After a section is submitted or locked, you cannot return to it.
            </li>

            <li>
              You may navigate only within the currently active section.
            </li>

            <li>
              Use Save & Next, Clear Response and Mark & Next as required.
            </li>

            <li>
              The final test will automatically submit when the final section time expires.
            </li>
          </ol>
        </div>

        {/* HINDI INSTRUCTIONS */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
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
              सामान्य बुद्धिमत्ता एवं तर्कशक्ति में 50 प्रश्न होंगे तथा 30 मिनट का अनुभागीय समय मिलेगा।
            </li>

            <li>
              सामान्य जागरूकता में 50 प्रश्न होंगे तथा 30 मिनट का अनुभागीय समय मिलेगा।
            </li>

            <li>
              अंग्रेजी भाषा एवं बोधगम्यता में 100 प्रश्न होंगे तथा 60 मिनट का अनुभागीय समय मिलेगा।
            </li>

            <li>
              प्रत्येक सही उत्तर के लिए 1 अंक मिलेगा।
            </li>

            <li>
              प्रत्येक गलत उत्तर पर 0.25 अंक की कटौती होगी।
            </li>

            <li>
              बिना उत्तर दिए गए प्रश्न पर कोई ऋणात्मक अंक नहीं काटा जाएगा।
            </li>

            <li>
              अनुभाग का निर्धारित समय समाप्त होते ही वह स्वतः लॉक हो जाएगा।
            </li>

            <li>
              अनुभाग submit या lock होने के बाद उसमें वापस नहीं जा सकेंगे।
            </li>

            <li>
              केवल वर्तमान सक्रिय अनुभाग के प्रश्नों के बीच जा सकेंगे।
            </li>

            <li>
              आवश्यकता के अनुसार Save & Next, Clear Response तथा Mark & Next का प्रयोग करें।
            </li>

            <li>
              अंतिम अनुभाग का समय समाप्त होते ही पूरा टेस्ट स्वतः submit हो जाएगा।
            </li>
          </ol>
        </div>

        {/* DEFAULT LANGUAGE DROPDOWN */}

        <div className="card">

          <h2
            style={{
              marginTop: 0,
              marginBottom: "6px",
            }}
          >
            Default Exam Language
          </h2>

          <div className="muted">
            परीक्षा की डिफॉल्ट भाषा चुनें
          </div>

          <label style={selectLabel}>
            Select Language / भाषा चुनें

            <select
              value={language}
              onChange={(e) =>
                changeLanguage(
                  e.target.value
                )
              }
              style={languageSelect}
            >
              <option value="english">
                English
              </option>

              <option value="hindi">
                हिन्दी
              </option>
            </select>
          </label>

          <div style={languageInfo}>
            आपका test{" "}
            <b>
              {language === "hindi"
                ? "हिन्दी"
                : "English"}
            </b>{" "}
            को default language रखकर खुलेगा।
          </div>

          <div style={changeNote}>
            परीक्षा के दौरान भी ऊपर दिए गए
            <b> Change Language </b>
            विकल्प से English और हिन्दी के बीच बदला जा सकेगा।
          </div>

        </div>

        {/* DECLARATION */}

        <div className="card">

          <h2
            style={{
              marginTop: 0,
            }}
          >
            Declaration / घोषणा
          </h2>

          <label style={declarationStyle}>

            <input
              type="checkbox"
              checked={agree}
              onChange={(e) =>
                setAgree(
                  e.target.checked
                )
              }
              style={{
                width: "22px",
                height: "22px",
                flexShrink: 0,
                cursor: "pointer",
              }}
            />

            <span>
              I have read and understood all instructions and selected my default exam language.

              <br />
              <br />

              मैंने सभी निर्देश पढ़ एवं समझ लिए हैं तथा परीक्षा की डिफॉल्ट भाषा चुन ली है।
            </span>

          </label>

          <button
            className="btn"
            disabled={!agree}
            onClick={startTest}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "15px",
              fontSize: "17px",
              opacity:
                agree
                  ? 1
                  : 0.5,
              cursor:
                agree
                  ? "pointer"
                  : "not-allowed",
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

function SummaryBox({
  title,
  hindi,
  value,
}) {
  return (
    <div style={summaryBox}>
      <b>
        {title}
      </b>

      <div style={summaryValue}>
        {value}
      </div>

      <div className="muted">
        {hindi}
      </div>
    </div>
  );
}

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(125px, 1fr))",
  gap: "12px",
  marginTop: "16px",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "620px",
};

const cellStyle = {
  border: "1px solid #d7deea",
  padding: "11px",
  textAlign: "left",
  fontSize: "14px",
};

const instructionList = {
  lineHeight: "1.8",
  paddingLeft: "22px",
};

const selectLabel = {
  display: "block",
  marginTop: "18px",
  fontSize: "14px",
  fontWeight: "700",
};

const languageSelect = {
  width: "100%",
  minHeight: "52px",
  marginTop: "8px",
  padding: "0 14px",
  border: "2px solid #1769e0",
  borderRadius: "10px",
  background: "#ffffff",
  fontSize: "17px",
  fontWeight: "700",
  color: "#172033",
  cursor: "pointer",
};

const languageInfo = {
  marginTop: "13px",
  padding: "11px 12px",
  background: "#eef5ff",
  borderRadius: "9px",
  lineHeight: "1.5",
  fontSize: "14px",
};

const changeNote = {
  marginTop: "9px",
  color: "#667085",
  fontSize: "13px",
  lineHeight: "1.5",
};

const declarationStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  fontWeight: "600",
  lineHeight: "1.6",
  cursor: "pointer",
};
