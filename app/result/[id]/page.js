"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const SECTION_INFO = {
  reasoning: {
    name: "Reasoning",
    fullName: "General Intelligence & Reasoning",
    hindi: "सामान्य बुद्धिमत्ता एवं तर्कशक्ति",
  },

  ga: {
    name: "General Awareness",
    fullName: "General Awareness",
    hindi: "सामान्य जागरूकता",
  },

  english: {
    name: "English",
    fullName: "English Language & Comprehension",
    hindi: "अंग्रेजी भाषा एवं बोधगम्यता",
  },
};

export default function ResultPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [test, setTest] = useState(null);

  const [overall, setOverall] = useState(null);
  const [sections, setSections] = useState([]);

  const [solutions, setSolutions] = useState([]);
  const [solutionsLocked, setSolutionsLocked] = useState(false);

  useEffect(() => {
    loadResult();
  }, [id]);

  async function loadResult() {
    setLoading(true);
    setError("");

    const client = supabase();

    const { data: testData, error: testError } =
      await client
        .from("tests")
        .select(`
          id,
          title,
          total_questions,
          total_marks,
          duration_minutes,
          negative_mark,
          solution_release_at
        `)
        .eq("id", id)
        .single();

    if (testError) {
      setError(testError.message);
      setLoading(false);
      return;
    }

    setTest(testData);

    const { data: analysisData, error: analysisError } =
      await client.rpc(
        "get_result_analysis",
        {
          p_test_id: Number(id),
        }
      );

    if (analysisError) {
      setError(analysisError.message);
      setLoading(false);
      return;
    }

    setOverall(
      normalizeOverall(
        analysisData?.overall
      )
    );

    setSections(
      (analysisData?.sections || []).map(
        normalizeSection
      )
    );

    await loadSolutions();

    setLoading(false);
  }

  function normalizeOverall(data) {
    if (!data) return null;

    return {
      total: Number(data.total || 0),
      attempted: Number(data.attempted || 0),
      unattempted: Number(data.unattempted || 0),
      correct: Number(data.correct || 0),
      wrong: Number(data.wrong || 0),

      marked:
        Number(
          data.marked_for_review || 0
        ),

      score: Number(data.score || 0),

      accuracy:
        Number(data.accuracy || 0),

      attemptRate:
        Number(
          data.attempt_rate || 0
        ),

      negativeLoss:
        Number(
          data.negative_loss || 0
        ),
    };
  }

  function normalizeSection(data) {
    const info =
      SECTION_INFO[data.key] || {};

    return {
      key: data.key,

      name:
        info.name ||
        data.name ||
        data.key,

      fullName:
        info.fullName ||
        data.name ||
        data.key,

      hindi:
        info.hindi || "",

      total:
        Number(data.total || 0),

      attempted:
        Number(data.attempted || 0),

      unattempted:
        Number(data.unattempted || 0),

      correct:
        Number(data.correct || 0),

      wrong:
        Number(data.wrong || 0),

      marked:
        Number(
          data.marked_for_review || 0
        ),

      score:
        Number(data.score || 0),

      accuracy:
        Number(data.accuracy || 0),

      attemptRate:
        Number(
          data.attempt_rate || 0
        ),

      negativeLoss:
        Number(
          data.negative_loss || 0
        ),
    };
  }

  async function loadSolutions() {
    const { data, error } =
      await supabase().rpc(
        "get_test_solutions",
        {
          p_test_id: Number(id),
        }
      );

    if (error) {
      setSolutionsLocked(true);
      setSolutions([]);
      return;
    }

    setSolutionsLocked(false);
    setSolutions(data || []);
  }

  function roundNumber(value) {
    return Number(value || 0).toFixed(2);
  }

  function getSectionName(order) {
    if (order <= 50) {
      return "Reasoning";
    }

    if (order <= 100) {
      return "General Awareness";
    }

    return "English";
  }

  function getOptionText(
    item,
    answer
  ) {
    if (!answer) {
      return "Not Attempted";
    }

    const key =
      String(answer).toUpperCase();

    if (key === "A") {
      return item.option_a || "";
    }

    if (key === "B") {
      return item.option_b || "";
    }

    if (key === "C") {
      return item.option_c || "";
    }

    if (key === "D") {
      return item.option_d || "";
    }

    return "";
  }

  function getHindiOptionText(
    item,
    answer
  ) {
    if (!answer) return "";

    const key =
      String(answer).toUpperCase();

    if (key === "A") {
      return item.option_a_hi || "";
    }

    if (key === "B") {
      return item.option_b_hi || "";
    }

    if (key === "C") {
      return item.option_c_hi || "";
    }

    if (key === "D") {
      return item.option_d_hi || "";
    }

    return "";
  }

  function getQuestionResult(item) {
    if (!item.selected_answer) {
      return {
        label:
          "Not Attempted / प्रयास नहीं किया",
        symbol: "⚪",
      };
    }

    if (
      String(
        item.selected_answer
      ).toUpperCase() ===
      String(
        item.correct_answer
      ).toUpperCase()
    ) {
      return {
        label:
          "Correct / सही उत्तर",
        symbol: "✅",
      };
    }

    return {
      label:
        "Incorrect / गलत उत्तर",
      symbol: "❌",
    };
  }

  if (loading) {
    return (
      <>
        <div className="nav">
          JD Exambook • Result
        </div>

        <main className="wrap">
          <div className="card">
            Result loading...
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="nav">
          JD Exambook • Result
        </div>

        <main className="wrap">
          <div className="card">
            <b>Error:</b> {error}
          </div>
        </main>
      </>
    );
  }

  const bestSection =
    [...sections].sort(
      (a, b) =>
        b.accuracy -
        a.accuracy
    )[0];

  const weakestSection =
    [...sections].sort(
      (a, b) =>
        a.accuracy -
        b.accuracy
    )[0];

  return (
    <>
      <div className="nav">
        JD Exambook • Result & Analysis
      </div>

      <main className="wrap">

        <div className="card hero">
          <h2>
            {test?.title}
          </h2>

          <p>
            Test Submitted Successfully
          </p>

          <div
            style={{
              fontSize: "38px",
              fontWeight: "800",
              marginTop: "10px",
            }}
          >
            {roundNumber(
              overall?.score
            )}
            {" / "}
            {overall?.total}
          </div>

          <p>
            Overall Score / कुल प्राप्तांक
          </p>
        </div>

        <div className="card">
          <h2>
            Overall Performance / समग्र प्रदर्शन
          </h2>

          <div style={statsGrid}>
            <StatBox
              title="Total"
              hindi="कुल प्रश्न"
              value={overall?.total}
            />

            <StatBox
              title="Attempted"
              hindi="प्रयास किए"
              value={overall?.attempted}
            />

            <StatBox
              title="Unattempted"
              hindi="बिना प्रयास"
              value={overall?.unattempted}
            />

            <StatBox
              title="Correct"
              hindi="सही"
              value={overall?.correct}
            />

            <StatBox
              title="Wrong"
              hindi="गलत"
              value={overall?.wrong}
            />

            <StatBox
              title="Marked Review"
              hindi="समीक्षा हेतु"
              value={overall?.marked}
            />

            <StatBox
              title="Score"
              hindi="प्राप्तांक"
              value={roundNumber(
                overall?.score
              )}
            />

            <StatBox
              title="Accuracy"
              hindi="शुद्धता"
              value={`${roundNumber(
                overall?.accuracy
              )}%`}
            />

            <StatBox
              title="Attempt Rate"
              hindi="प्रयास प्रतिशत"
              value={`${roundNumber(
                overall?.attemptRate
              )}%`}
            />

            <StatBox
              title="Negative Loss"
              hindi="नेगेटिव अंक कटे"
              value={roundNumber(
                overall?.negativeLoss
              )}
            />
          </div>
        </div>

        {sections.length > 0 && (
          <div className="card">
            <h2>
              Performance Highlights
            </h2>

            <div style={statsGrid}>
              <div style={highlightBox}>
                <div className="muted">
                  Best Section
                </div>

                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: "800",
                    marginTop: "8px",
                  }}
                >
                  {bestSection?.name}
                </div>

                <div>
                  Accuracy:{" "}
                  {roundNumber(
                    bestSection?.accuracy
                  )}
                  %
                </div>
              </div>

              <div style={highlightBox}>
                <div className="muted">
                  Weakest Section
                </div>

                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: "800",
                    marginTop: "8px",
                  }}
                >
                  {weakestSection?.name}
                </div>

                <div>
                  Accuracy:{" "}
                  {roundNumber(
                    weakestSection?.accuracy
                  )}
                  %
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h2>
            Section-wise Analysis
          </h2>

          <p className="muted">
            अनुभागवार प्रदर्शन
          </p>

          {sections.map(
            (section) => (
              <div
                key={section.key}
                style={sectionCard}
              >
                <h3>
                  {section.fullName}
                </h3>

                <div className="muted">
                  {section.hindi}
                </div>

                <div
                  style={{
                    ...statsGrid,
                    marginTop: "18px",
                  }}
                >
                  <StatBox
                    title="Total"
                    hindi="कुल"
                    value={section.total}
                  />

                  <StatBox
                    title="Attempted"
                    hindi="प्रयास"
                    value={
                      section.attempted
                    }
                  />

                  <StatBox
                    title="Unattempted"
                    hindi="बिना प्रयास"
                    value={
                      section.unattempted
                    }
                  />

                  <StatBox
                    title="Correct"
                    hindi="सही"
                    value={
                      section.correct
                    }
                  />

                  <StatBox
                    title="Wrong"
                    hindi="गलत"
                    value={
                      section.wrong
                    }
                  />

                  <StatBox
                    title="Marked Review"
                    hindi="समीक्षा"
                    value={
                      section.marked
                    }
                  />

                  <StatBox
                    title="Score"
                    hindi="अंक"
                    value={roundNumber(
                      section.score
                    )}
                  />

                  <StatBox
                    title="Accuracy"
                    hindi="शुद्धता"
                    value={`${roundNumber(
                      section.accuracy
                    )}%`}
                  />

                  <StatBox
                    title="Attempt Rate"
                    hindi="प्रयास %"
                    value={`${roundNumber(
                      section.attemptRate
                    )}%`}
                  />

                  <StatBox
                    title="Negative Loss"
                    hindi="कटे अंक"
                    value={roundNumber(
                      section.negativeLoss
                    )}
                  />
                </div>
              </div>
            )
          )}
        </div>

        <div className="card">
          <h2>
            Section Comparison
          </h2>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "900px",
              }}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>
                    Section
                  </th>

                  <th style={cellStyle}>
                    Total
                  </th>

                  <th style={cellStyle}>
                    Attempted
                  </th>

                  <th style={cellStyle}>
                    Unattempted
                  </th>

                  <th style={cellStyle}>
                    Correct
                  </th>

                  <th style={cellStyle}>
                    Wrong
                  </th>

                  <th style={cellStyle}>
                    Review
                  </th>

                  <th style={cellStyle}>
                    Score
                  </th>

                  <th style={cellStyle}>
                    Accuracy
                  </th>
                </tr>
              </thead>

              <tbody>
                {sections.map(
                  (section) => (
                    <tr
                      key={section.key}
                    >
                      <td style={cellStyle}>
                        <b>
                          {section.name}
                        </b>
                      </td>

                      <td style={cellStyle}>
                        {section.total}
                      </td>

                      <td style={cellStyle}>
                        {section.attempted}
                      </td>

                      <td style={cellStyle}>
                        {section.unattempted}
                      </td>

                      <td style={cellStyle}>
                        {section.correct}
                      </td>

                      <td style={cellStyle}>
                        {section.wrong}
                      </td>

                      <td style={cellStyle}>
                        {section.marked}
                      </td>

                      <td style={cellStyle}>
                        {roundNumber(
                          section.score
                        )}
                      </td>

                      <td style={cellStyle}>
                        {roundNumber(
                          section.accuracy
                        )}
                        %
                      </td>
                    </tr>
                  )
                )}

                <tr>
                  <td style={cellStyle}>
                    <b>Overall</b>
                  </td>

                  <td style={cellStyle}>
                    {overall?.total}
                  </td>

                  <td style={cellStyle}>
                    {overall?.attempted}
                  </td>

                  <td style={cellStyle}>
                    {overall?.unattempted}
                  </td>

                  <td style={cellStyle}>
                    {overall?.correct}
                  </td>

                  <td style={cellStyle}>
                    {overall?.wrong}
                  </td>

                  <td style={cellStyle}>
                    {overall?.marked}
                  </td>

                  <td style={cellStyle}>
                    {roundNumber(
                      overall?.score
                    )}
                  </td>

                  <td style={cellStyle}>
                    {roundNumber(
                      overall?.accuracy
                    )}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>
            Detailed Answer Sheet
          </h2>

          <p className="muted">
            विस्तृत उत्तर-पत्र एवं समाधान
          </p>

          {solutionsLocked ? (
            <div className="lock">
              🔒 Detailed answers and explanations are currently locked.
              <br />
              <br />
              निर्धारित solution-release समय पूरा होने के बाद सही उत्तर एवं explanation उपलब्ध होंगे।
            </div>
          ) : (
            <>
              {solutions.map(
                (item, index) => {
                  const result =
                    getQuestionResult(
                      item
                    );

                  const yourText =
                    getOptionText(
                      item,
                      item.selected_answer
                    );

                  const correctText =
                    getOptionText(
                      item,
                      item.correct_answer
                    );

                  const yourHindi =
                    getHindiOptionText(
                      item,
                      item.selected_answer
                    );

                  const correctHindi =
                    getHindiOptionText(
                      item,
                      item.correct_answer
                    );

                  return (
                    <div
                      key={
                        item.question_id ||
                        index
                      }
                      style={solutionCard}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <b>
                          Question{" "}
                          {item.question_order ||
                            index + 1}
                        </b>

                        <span
                          style={{
                            fontWeight:
                              "700",
                          }}
                        >
                          {getSectionName(
                            item.question_order ||
                              index + 1
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "10px",
                          fontWeight: "800",
                        }}
                      >
                        {result.symbol}{" "}
                        {result.label}
                      </div>

                      {item.marked_for_review && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontWeight:
                              "700",
                          }}
                        >
                          🟣 Marked for Review
                        </div>
                      )}

                      <h3
                        style={{
                          lineHeight: "1.6",
                          marginTop: "18px",
                        }}
                      >
                        {item.question_text}
                      </h3>

                      {item.question_text_hi && (
                        <div
                          style={{
                            fontSize: "17px",
                            lineHeight: "1.6",
                            fontWeight: "600",
                            marginBottom:
                              "15px",
                          }}
                        >
                          {
                            item.question_text_hi
                          }
                        </div>
                      )}

                      <div style={answerBox}>
                        <b>
                          Your Answer / आपका उत्तर
                        </b>

                        <div
                          style={{
                            marginTop: "7px",
                          }}
                        >
                          {item.selected_answer
                            ? `${item.selected_answer}. ${yourText}`
                            : "Not Attempted / प्रयास नहीं किया"}
                        </div>

                        {yourHindi && (
                          <div
                            style={{
                              marginTop:
                                "4px",
                              color:
                                "#667085",
                            }}
                          >
                            {yourHindi}
                          </div>
                        )}
                      </div>

                      <div style={answerBox}>
                        <b>
                          Correct Answer / सही उत्तर
                        </b>

                        <div
                          style={{
                            marginTop: "7px",
                          }}
                        >
                          {
                            item.correct_answer
                          }
                          . {correctText}
                        </div>

                        {correctHindi && (
                          <div
                            style={{
                              marginTop:
                                "4px",
                              color:
                                "#667085",
                            }}
                          >
                            {correctHindi}
                          </div>
                        )}
                      </div>

                      {(item.explanation ||
                        item.explanation_hi) && (
                        <div
                          style={{
                            marginTop: "14px",
                            padding: "14px",
                            border:
                              "1px solid #d7deea",
                            borderRadius:
                              "10px",
                          }}
                        >
                          <b>
                            Explanation / व्याख्या
                          </b>

                          {item.explanation && (
                            <p
                              style={{
                                lineHeight:
                                  "1.6",
                              }}
                            >
                              {
                                item.explanation
                              }
                            </p>
                          )}

                          {item.explanation_hi && (
                            <p
                              style={{
                                lineHeight:
                                  "1.6",
                                marginBottom:
                                  "0",
                              }}
                            >
                              {
                                item.explanation_hi
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </>
          )}
        </div>

        <div className="card">
          <Link href="/dashboard">
            <button
              className="btn"
              style={{
                width: "100%",
                padding: "14px",
              }}
            >
              Back to Dashboard
            </button>
          </Link>
        </div>

      </main>
    </>
  );
}

function StatBox({
  title,
  hindi,
  value,
}) {
  return (
    <div style={statBox}>
      <div className="muted">
        {title}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: "800",
          margin: "5px 0",
        }}
      >
        {value ?? 0}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#667085",
        }}
      >
        {hindi}
      </div>
    </div>
  );
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(125px, 1fr))",
  gap: "10px",
};

const statBox = {
  padding: "14px",
  border: "1px solid #d7deea",
  borderRadius: "12px",
  background: "#f8fafc",
  textAlign: "center",
};

const highlightBox = {
  padding: "18px",
  border: "1px solid #d7deea",
  borderRadius: "12px",
  background: "#f8fafc",
};

const sectionCard = {
  border: "1px solid #d7deea",
  borderRadius: "14px",
  padding: "18px",
  marginTop: "16px",
};

const cellStyle = {
  border: "1px solid #d7deea",
  padding: "10px",
  textAlign: "center",
  fontSize: "14px",
};

const solutionCard = {
  border: "1px solid #d7deea",
  borderRadius: "12px",
  padding: "16px",
  marginTop: "16px",
};

const answerBox = {
  marginTop: "12px",
  padding: "13px",
  border: "1px solid #d7deea",
  borderRadius: "10px",
  background: "#f8fafc",
};
