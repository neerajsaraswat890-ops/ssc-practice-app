"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [config, setConfig] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const [solutions, setSolutions] = useState([]);
  const [solutionsLocked, setSolutionsLocked] = useState(false);
  const [solutionError, setSolutionError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadResult();
  }, [id]);

  async function loadResult() {
    setLoading(true);
    setError("");
    setSolutionError("");

    const client = supabase();

    /*
      =====================================================
      TEST META
      =====================================================
    */

    const {
      data: testData,
      error: testError,
    } = await client
      .from("tests")
      .select(`
        id,
        title,
        test_type,
        solution_release_at,
        exam_stage_id
      `)
      .eq("id", id)
      .single();

    if (testError) {
      setError(testError.message);
      setLoading(false);
      return;
    }

    setTest(testData);

    /*
      =====================================================
      EXAM CONFIG
      =====================================================
    */

    const {
      data: configData,
      error: configError,
    } = await client.rpc(
      "get_test_exam_config",
      {
        p_test_id: Number(id),
      }
    );

    if (!configError && configData) {
      setConfig(configData);
    }

    /*
      =====================================================
      RESULT ANALYSIS
      =====================================================
    */

    const {
      data: analysisData,
      error: analysisError,
    } = await client.rpc(
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

    setAnalysis(analysisData);

    /*
      =====================================================
      DETAILED SOLUTIONS
      =====================================================
    */

    const {
      data: solutionData,
      error: solutionsError,
    } = await client.rpc(
      "get_test_solutions",
      {
        p_test_id: Number(id),
      }
    );

    if (solutionsError) {
      const message =
        solutionsError.message || "";

      const lower =
        message.toLowerCase();

      if (
        lower.includes("release") ||
        lower.includes("locked") ||
        lower.includes("available") ||
        lower.includes("solution")
      ) {
        setSolutionsLocked(true);
      } else {
        setSolutionError(message);
      }
    } else {
      setSolutions(solutionData || []);
      setSolutionsLocked(false);
    }

    setLoading(false);
  }

  /*
    =====================================================
    RESULT DATA
    =====================================================
  */

  const overall =
    analysis?.overall || {};

  const sections =
    Array.isArray(analysis?.sections)
      ? analysis.sections
      : [];

  /*
    =====================================================
    SECTION NAME FALLBACK
    =====================================================
  */

  function findConfigSection(section) {
    if (!section) {
      return null;
    }

    const configSections =
      Array.isArray(config?.sections)
        ? config.sections
        : [];

    return (
      configSections.find(
        (item) =>
          String(item.section_code || "") ===
            String(section.section_code || "") ||
          Number(item.display_order) ===
            Number(section.display_order)
      ) || null
    );
  }

  function getSectionName(section) {
    if (!section) {
      return "Section";
    }

    const configSection =
      findConfigSection(section);

    return (
      section.section_name ||
      configSection?.section_name ||
      humanizeCode(section.section_code) ||
      "Section"
    );
  }

  function getSectionHindiName(section) {
    if (!section) {
      return "";
    }

    const configSection =
      findConfigSection(section);

    return (
      section.section_name_hi ||
      configSection?.section_name_hi ||
      ""
    );
  }

  /*
    =====================================================
    BEST / WEAKEST SECTION
    =====================================================
  */

  const bestSection =
    useMemo(() => {
      if (!sections.length) {
        return null;
      }

      return [...sections].sort(
        (a, b) => {
          const accuracyDiff =
            Number(b.accuracy || 0) -
            Number(a.accuracy || 0);

          if (accuracyDiff !== 0) {
            return accuracyDiff;
          }

          return (
            Number(b.score || 0) -
            Number(a.score || 0)
          );
        }
      )[0];
    }, [sections]);

  const weakestSection =
    useMemo(() => {
      if (!sections.length) {
        return null;
      }

      return [...sections].sort(
        (a, b) => {
          const accuracyDiff =
            Number(a.accuracy || 0) -
            Number(b.accuracy || 0);

          if (accuracyDiff !== 0) {
            return accuracyDiff;
          }

          return (
            Number(a.score || 0) -
            Number(b.score || 0)
          );
        }
      )[0];
    }, [sections]);

  /*
    =====================================================
    SOLUTION SECTION MAPPING
    =====================================================
  */

  function getSectionForQuestion(questionOrder) {
    const order =
      Number(questionOrder);

    const found =
      sections.find(
        (section) =>
          order >=
            Number(
              section.start_order || 1
            ) &&
          order <=
            Number(
              section.end_order || 0
            )
      );

    if (found) {
      return found;
    }

    return {
      section_code: "FULL_PAPER",
      section_name: "Full Paper",
      section_name_hi:
        "सम्पूर्ण प्रश्नपत्र",
      display_order: 1,
    };
  }

  /*
    =====================================================
    FORMATTERS
    =====================================================
  */

  function formatNumber(
    value,
    digits = 2
  ) {
    const number =
      Number(value || 0);

    if (Number.isInteger(number)) {
      return number;
    }

    return number.toFixed(digits);
  }

  function optionText(
    solution,
    letter
  ) {
    if (!letter) {
      return {
        en: "",
        hi: "",
      };
    }

    const key =
      String(letter)
        .toUpperCase();

    const map = {
      A: {
        en: solution.option_a,
        hi: solution.option_a_hi,
      },

      B: {
        en: solution.option_b,
        hi: solution.option_b_hi,
      },

      C: {
        en: solution.option_c,
        hi: solution.option_c_hi,
      },

      D: {
        en: solution.option_d,
        hi: solution.option_d_hi,
      },
    };

    return (
      map[key] || {
        en: "",
        hi: "",
      }
    );
  }

  function solutionStatus(solution) {
    if (!solution.selected_answer) {
      return {
        label: "Not Attempted",
        symbol: "⚪",
        style: statusUnattempted,
      };
    }

    if (
      String(
        solution.selected_answer
      ).toUpperCase() ===
      String(
        solution.correct_answer
      ).toUpperCase()
    ) {
      return {
        label: "Correct",
        symbol: "✅",
        style: statusCorrect,
      };
    }

    return {
      label: "Incorrect",
      symbol: "❌",
      style: statusWrong,
    };
  }

  /*
    =====================================================
    LOADING
    =====================================================
  */

  if (loading) {
    return (
      <div style={centerPage}>
        Loading result...
      </div>
    );
  }

  /*
    =====================================================
    ERROR
    =====================================================
  */

  if (error || !analysis) {
    return (
      <div style={centerPage}>
        <div style={errorCard}>
          <b>
            Unable to load result
          </b>

          <div
            style={{
              marginTop: "8px",
            }}
          >
            {error ||
              "Result not available"}
          </div>

          <button
            style={primaryButton}
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /*
    =====================================================
    SCORE PERCENTAGE
    =====================================================
  */

  const totalMarks =
    Number(
      overall.total_marks ||
        config?.stage?.total_marks ||
        0
    );

  const scorePercentage =
    totalMarks > 0
      ? (
          (Number(overall.score || 0) /
            totalMarks) *
          100
        )
      : 0;

  return (
    <>
      {/* =================================================
          TOP NAV
      ================================================= */}

      <div style={navBar}>

        <div>
          <div style={brand}>
            JD Exambook
          </div>

          <div style={navSubtitle}>
            Result & Performance Analysis
          </div>
        </div>

        <button
          style={navButton}
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          Dashboard
        </button>

      </div>

      <main style={pageWrap}>

        {/* =================================================
            RESULT HERO
        ================================================= */}

        <section style={hero}>

          <div style={heroExam}>
            {config?.exam?.exam_name ||
              "Examination"}
          </div>

          <h1 style={heroTitle}>
            {test?.title}
          </h1>

          <div style={heroStage}>
            {config?.stage?.stage_name ||
              ""}
          </div>

          <div style={scoreRow}>

            <div>

              <div style={scoreLabel}>
                Your Score
              </div>

              <div style={mainScore}>

                {formatNumber(
                  overall.score
                )}

                <span style={scoreTotal}>
                  {" / "}
                  {formatNumber(
                    totalMarks
                  )}
                </span>

              </div>

            </div>

            <div style={percentageBox}>

              <div style={percentageValue}>
                {formatNumber(
                  scorePercentage
                )}
                %
              </div>

              <div style={percentageLabel}>
                Score Percentage
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            OVERALL PERFORMANCE
        ================================================= */}

        <section style={card}>

          <h2 style={cardTitle}>
            Overall Performance
          </h2>

          <div style={metricGrid}>

            <Metric
              label="Total Questions"
              value={overall.total}
            />

            <Metric
              label="Attempted"
              value={overall.attempted}
            />

            <Metric
              label="Unattempted"
              value={overall.unattempted}
            />

            <Metric
              label="Correct"
              value={overall.correct}
              type="success"
            />

            <Metric
              label="Wrong"
              value={overall.wrong}
              type="danger"
            />

            <Metric
              label="Marked Review"
              value={
                overall.marked_for_review
              }
            />

            <Metric
              label="Accuracy"
              value={`${formatNumber(
                overall.accuracy
              )}%`}
            />

            <Metric
              label="Attempt Rate"
              value={`${formatNumber(
                overall.attempt_rate
              )}%`}
            />

            <Metric
              label="Negative Loss"
              value={formatNumber(
                overall.negative_loss
              )}
              type="danger"
            />

            <Metric
              label="Final Score"
              value={formatNumber(
                overall.score
              )}
              type="primary"
            />

          </div>

        </section>

        {/* =================================================
            PERFORMANCE HIGHLIGHTS
        ================================================= */}

        {sections.length > 1 && (
          <section style={card}>

            <h2 style={cardTitle}>
              Performance Highlights
            </h2>

            <div style={highlightGrid}>

              <div style={bestCard}>

                <div style={highlightIcon}>
                  🏆
                </div>

                <div style={highlightSmall}>
                  Best Section
                </div>

                <div style={highlightName}>
                  {getSectionName(
                    bestSection
                  )}
                </div>

                {getSectionHindiName(
                  bestSection
                ) && (
                  <div style={highlightHindi}>
                    {getSectionHindiName(
                      bestSection
                    )}
                  </div>
                )}

                <div style={highlightScore}>
                  {formatNumber(
                    bestSection?.accuracy
                  )}
                  % Accuracy
                </div>

              </div>

              <div style={weakCard}>

                <div style={highlightIcon}>
                  🎯
                </div>

                <div style={highlightSmall}>
                  Needs More Practice
                </div>

                <div style={highlightName}>
                  {getSectionName(
                    weakestSection
                  )}
                </div>

                {getSectionHindiName(
                  weakestSection
                ) && (
                  <div style={highlightHindi}>
                    {getSectionHindiName(
                      weakestSection
                    )}
                  </div>
                )}

                <div style={highlightScore}>
                  {formatNumber(
                    weakestSection?.accuracy
                  )}
                  % Accuracy
                </div>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            SECTION-WISE PERFORMANCE
        ================================================= */}

        <section style={card}>

          <h2 style={cardTitle}>
            Section-wise Performance
          </h2>

          <div style={sectionCards}>

            {sections.map(
              (section, index) => {

                const sectionName =
                  getSectionName(section);

                const sectionHindiName =
                  getSectionHindiName(
                    section
                  );

                return (
                  <div
                    key={
                      section.section_code ||
                      section.section_id ||
                      index
                    }
                    style={sectionCard}
                  >

                    <div style={sectionHeader}>

                      <div>

                        <div style={sectionTitle}>
                          {sectionName}
                        </div>

                        {sectionHindiName && (
                          <div style={sectionHindi}>
                            {sectionHindiName}
                          </div>
                        )}

                      </div>

                      <div style={sectionScore}>
                        {formatNumber(
                          section.score
                        )}
                        {" / "}
                        {formatNumber(
                          section.total_marks
                        )}
                      </div>

                    </div>

                    <div style={sectionMetricGrid}>

                      <SmallMetric
                        label="Total"
                        value={section.total}
                      />

                      <SmallMetric
                        label="Attempted"
                        value={
                          section.attempted
                        }
                      />

                      <SmallMetric
                        label="Unattempted"
                        value={
                          section.unattempted
                        }
                      />

                      <SmallMetric
                        label="Correct"
                        value={
                          section.correct
                        }
                      />

                      <SmallMetric
                        label="Wrong"
                        value={
                          section.wrong
                        }
                      />

                      <SmallMetric
                        label="Accuracy"
                        value={`${formatNumber(
                          section.accuracy
                        )}%`}
                      />

                      <SmallMetric
                        label="Attempt Rate"
                        value={`${formatNumber(
                          section.attempt_rate
                        )}%`}
                      />

                      <SmallMetric
                        label="Negative Loss"
                        value={formatNumber(
                          section.negative_loss
                        )}
                      />

                      <SmallMetric
                        label="Review"
                        value={
                          section.marked_for_review
                        }
                      />

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* =================================================
            SECTION COMPARISON
        ================================================= */}

        <section style={card}>

          <h2 style={cardTitle}>
            Section Comparison
          </h2>

          <div style={tableScroll}>

            <table style={comparisonTable}>

              <thead>

                <tr>

                  <th style={th}>
                    Section
                  </th>

                  <th style={th}>
                    Q
                  </th>

                  <th style={th}>
                    Attempt
                  </th>

                  <th style={th}>
                    Correct
                  </th>

                  <th style={th}>
                    Wrong
                  </th>

                  <th style={th}>
                    Score
                  </th>

                  <th style={th}>
                    Accuracy
                  </th>

                  <th style={th}>
                    Negative
                  </th>

                </tr>

              </thead>

              <tbody>

                {sections.map(
                  (section, index) => (
                    <tr
                      key={
                        `table-${
                          section.section_code ||
                          section.section_id ||
                          index
                        }`
                      }
                    >

                      <td style={tdLeft}>

                        <b>
                          {getSectionName(
                            section
                          )}
                        </b>

                        {getSectionHindiName(
                          section
                        ) && (
                          <div style={tableHindi}>
                            {getSectionHindiName(
                              section
                            )}
                          </div>
                        )}

                      </td>

                      <td style={td}>
                        {section.total}
                      </td>

                      <td style={td}>
                        {section.attempted}
                      </td>

                      <td style={td}>
                        {section.correct}
                      </td>

                      <td style={td}>
                        {section.wrong}
                      </td>

                      <td style={td}>
                        {formatNumber(
                          section.score
                        )}
                      </td>

                      <td style={td}>
                        {formatNumber(
                          section.accuracy
                        )}
                        %
                      </td>

                      <td style={td}>
                        {formatNumber(
                          section.negative_loss
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* =================================================
            DETAILED ANSWER SHEET
        ================================================= */}

        <section style={card}>

          <h2 style={cardTitle}>
            Detailed Answer Sheet
          </h2>

          {solutionsLocked ? (

            <div style={lockedBox}>

              <div style={lockIcon}>
                🔒
              </div>

              <h3>
                Detailed Solutions Locked
              </h3>

              <p style={mutedText}>
                इस test की detailed answer sheet निर्धारित solution release time के बाद उपलब्ध होगी।
              </p>

              {test?.solution_release_at && (
                <div style={releaseBox}>

                  Solution Release:
                  {" "}

                  <b>
                    {new Date(
                      test.solution_release_at
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </b>

                </div>
              )}

            </div>

          ) : solutionError ? (

            <div style={warningBox}>
              {solutionError}
            </div>

          ) : solutions.length === 0 ? (

            <div style={emptyBox}>
              Detailed solutions are not available.
            </div>

          ) : (

            <div style={solutionList}>

              {solutions.map(
                (
                  solution,
                  index
                ) => {

                  const section =
                    getSectionForQuestion(
                      solution.question_order
                    );

                  const status =
                    solutionStatus(
                      solution
                    );

                  const selected =
                    optionText(
                      solution,
                      solution.selected_answer
                    );

                  const correct =
                    optionText(
                      solution,
                      solution.correct_answer
                    );

                  return (
                    <div
                      key={
                        solution.question_id ||
                        index
                      }
                      style={solutionCard}
                    >

                      <div style={solutionTop}>

                        <div>

                          <div style={solutionQuestionNo}>
                            Question{" "}
                            {
                              solution.question_order
                            }
                          </div>

                          <div style={solutionSection}>
                            {getSectionName(
                              section
                            )}
                          </div>

                          {getSectionHindiName(
                            section
                          ) && (
                            <div style={solutionSectionHi}>
                              {getSectionHindiName(
                                section
                              )}
                            </div>
                          )}

                        </div>

                        <div
                          style={{
                            ...statusBadge,
                            ...status.style,
                          }}
                        >
                          {status.symbol}
                          {" "}
                          {status.label}
                        </div>

                      </div>

                      {solution.marked_for_review && (
                        <div style={reviewBadge}>
                          🟣 Marked for Review
                        </div>
                      )}

                      <div style={solutionQuestion}>
                        {
                          solution.question_text
                        }
                      </div>

                      {solution.question_text_hi && (
                        <div style={solutionQuestionHi}>
                          {
                            solution.question_text_hi
                          }
                        </div>
                      )}

                      <div style={answerGrid}>

                        <div style={yourAnswerBox}>

                          <div style={answerLabel}>
                            Your Answer
                          </div>

                          {solution.selected_answer ? (
                            <>
                              <div style={answerLetter}>
                                {
                                  solution.selected_answer
                                }
                                .
                              </div>

                              <div>
                                {selected.en ||
                                  "—"}
                              </div>

                              {selected.hi && (
                                <div style={answerHindi}>
                                  {
                                    selected.hi
                                  }
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={notAttemptedText}>
                              Not Attempted
                            </div>
                          )}

                        </div>

                        <div style={correctAnswerBox}>

                          <div style={answerLabel}>
                            Correct Answer
                          </div>

                          <div style={answerLetter}>
                            {
                              solution.correct_answer
                            }
                            .
                          </div>

                          <div>
                            {correct.en ||
                              "—"}
                          </div>

                          {correct.hi && (
                            <div style={answerHindi}>
                              {
                                correct.hi
                              }
                            </div>
                          )}

                        </div>

                      </div>

                      {(solution.explanation ||
                        solution.explanation_hi) && (
                        <div style={explanationBox}>

                          <div style={explanationTitle}>
                            Explanation
                          </div>

                          {solution.explanation && (
                            <div style={explanationText}>
                              {
                                solution.explanation
                              }
                            </div>
                          )}

                          {solution.explanation_hi && (
                            <div style={explanationHindi}>
                              {
                                solution.explanation_hi
                              }
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =================================================
            BACK TO DASHBOARD
        ================================================= */}

        <button
          style={dashboardButton}
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          ← Back to Dashboard
        </button>

      </main>
    </>
  );
}

/*
  =========================================================
  HELPERS
  =========================================================
*/

function humanizeCode(code) {
  if (!code) {
    return "";
  }

  return String(code)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

/*
  =========================================================
  COMPONENTS
  =========================================================
*/

function Metric({
  label,
  value,
  type,
}) {
  let valueStyle =
    metricValue;

  if (type === "success") {
    valueStyle = {
      ...metricValue,
      color: "#15803d",
    };
  }

  if (type === "danger") {
    valueStyle = {
      ...metricValue,
      color: "#dc2626",
    };
  }

  if (type === "primary") {
    valueStyle = {
      ...metricValue,
      color: "#2563eb",
    };
  }

  return (
    <div style={metricCard}>

      <div style={metricLabel}>
        {label}
      </div>

      <div style={valueStyle}>
        {value ?? 0}
      </div>

    </div>
  );
}

function SmallMetric({
  label,
  value,
}) {
  return (
    <div style={smallMetric}>

      <div style={smallMetricLabel}>
        {label}
      </div>

      <div style={smallMetricValue}>
        {value ?? 0}
      </div>

    </div>
  );
}

/*
  =========================================================
  STYLES
  =========================================================
*/

const navBar = {
  minHeight: "62px",
  background: "#172033",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 18px",
};

const brand = {
  fontSize: "18px",
  fontWeight: "800",
};

const navSubtitle = {
  fontSize: "10px",
  opacity: 0.7,
  marginTop: "2px",
};

const navButton = {
  border: "1px solid #ffffff55",
  background: "#ffffff12",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "8px 11px",
  cursor: "pointer",
  fontWeight: "700",
};

const pageWrap = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "16px 12px 30px",
};

const hero = {
  borderRadius: "18px",
  padding: "22px",
  background:
    "linear-gradient(135deg,#173b75,#246ee9)",
  color: "#ffffff",
  marginBottom: "14px",
};

const heroExam = {
  fontSize: "12px",
  opacity: 0.8,
  fontWeight: "700",
};

const heroTitle = {
  margin: "6px 0 2px",
  fontSize:
    "clamp(20px,5vw,30px)",
};

const heroStage = {
  fontSize: "12px",
  opacity: 0.8,
};

const scoreRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  flexWrap: "wrap",
  marginTop: "24px",
};

const scoreLabel = {
  fontSize: "12px",
  opacity: 0.82,
};

const mainScore = {
  fontSize: "38px",
  lineHeight: 1.1,
  fontWeight: "900",
  marginTop: "5px",
};

const scoreTotal = {
  fontSize: "18px",
  fontWeight: "600",
  opacity: 0.8,
};

const percentageBox = {
  background: "#ffffff18",
  border: "1px solid #ffffff30",
  borderRadius: "12px",
  padding: "10px 14px",
  textAlign: "center",
};

const percentageValue = {
  fontSize: "23px",
  fontWeight: "900",
};

const percentageLabel = {
  fontSize: "9px",
  opacity: 0.75,
  marginTop: "3px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e6eaf0",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "14px",
  boxShadow:
    "0 4px 18px rgba(0,0,0,0.04)",
};

const cardTitle = {
  margin: "0 0 14px",
  fontSize: "19px",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(115px,1fr))",
  gap: "9px",
};

const metricCard = {
  background: "#f8fafc",
  border: "1px solid #e7ebf0",
  borderRadius: "10px",
  padding: "11px",
};

const metricLabel = {
  fontSize: "10px",
  color: "#667085",
};

const metricValue = {
  fontSize: "21px",
  fontWeight: "900",
  marginTop: "5px",
  color: "#172033",
};

const highlightGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "10px",
};

const bestCard = {
  borderRadius: "12px",
  padding: "15px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
};

const weakCard = {
  borderRadius: "12px",
  padding: "15px",
  border: "1px solid #fed7aa",
  background: "#fff7ed",
};

const highlightIcon = {
  fontSize: "24px",
};

const highlightSmall = {
  marginTop: "6px",
  fontSize: "10px",
  color: "#667085",
  fontWeight: "700",
};

const highlightName = {
  marginTop: "3px",
  fontSize: "16px",
  fontWeight: "900",
};

const highlightHindi = {
  marginTop: "2px",
  fontSize: "11px",
  color: "#64748b",
};

const highlightScore = {
  marginTop: "5px",
  fontSize: "12px",
  color: "#475569",
};

const sectionCards = {
  display: "grid",
  gap: "11px",
};

const sectionCard = {
  border: "1px solid #e4e8ee",
  borderRadius: "12px",
  padding: "13px",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const sectionTitle = {
  fontSize: "15px",
  fontWeight: "900",
};

const sectionHindi = {
  fontSize: "11px",
  color: "#667085",
  marginTop: "3px",
};

const sectionScore = {
  flexShrink: 0,
  fontWeight: "900",
  fontSize: "16px",
  color: "#2563eb",
};

const sectionMetricGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(85px,1fr))",
  gap: "7px",
  marginTop: "12px",
};

const smallMetric = {
  background: "#f8fafc",
  borderRadius: "8px",
  padding: "8px",
};

const smallMetricLabel = {
  fontSize: "9px",
  color: "#667085",
};

const smallMetricValue = {
  fontSize: "15px",
  fontWeight: "800",
  marginTop: "3px",
};

const tableScroll = {
  overflowX: "auto",
};

const comparisonTable = {
  width: "100%",
  minWidth: "720px",
  borderCollapse: "collapse",
};

const th = {
  background: "#f8fafc",
  padding: "10px",
  borderBottom:
    "1px solid #dde3eb",
  textAlign: "center",
  fontSize: "11px",
};

const td = {
  padding: "10px",
  borderBottom:
    "1px solid #eef1f5",
  textAlign: "center",
  fontSize: "12px",
};

const tdLeft = {
  ...td,
  textAlign: "left",
};

const tableHindi = {
  marginTop: "2px",
  fontSize: "9px",
  color: "#64748b",
};

const lockedBox = {
  padding: "28px 15px",
  textAlign: "center",
  background: "#f8fafc",
  borderRadius: "12px",
};

const lockIcon = {
  fontSize: "36px",
};

const mutedText = {
  color: "#667085",
  lineHeight: "1.6",
};

const releaseBox = {
  marginTop: "12px",
  display: "inline-block",
  padding: "9px 12px",
  background: "#ffffff",
  border: "1px solid #dfe5ec",
  borderRadius: "8px",
  fontSize: "12px",
};

const warningBox = {
  padding: "12px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "9px",
  color: "#9a3412",
};

const emptyBox = {
  padding: "18px",
  background: "#f8fafc",
  borderRadius: "9px",
  color: "#667085",
};

const solutionList = {
  display: "grid",
  gap: "13px",
};

const solutionCard = {
  border: "1px solid #e1e6ed",
  borderRadius: "12px",
  padding: "13px",
};

const solutionTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
};

const solutionQuestionNo = {
  fontSize: "12px",
  fontWeight: "900",
};

const solutionSection = {
  fontSize: "10px",
  color: "#475569",
  marginTop: "2px",
  fontWeight: "700",
};

const solutionSectionHi = {
  fontSize: "9px",
  color: "#64748b",
  marginTop: "2px",
};

const statusBadge = {
  flexShrink: 0,
  borderRadius: "20px",
  padding: "5px 9px",
  fontSize: "10px",
  fontWeight: "800",
};

const statusCorrect = {
  background: "#dcfce7",
  color: "#166534",
};

const statusWrong = {
  background: "#fee2e2",
  color: "#991b1b",
};

const statusUnattempted = {
  background: "#f1f5f9",
  color: "#475569",
};

const reviewBadge = {
  display: "inline-block",
  marginTop: "8px",
  padding: "4px 8px",
  background: "#f3e8ff",
  color: "#6b21a8",
  borderRadius: "15px",
  fontSize: "9px",
  fontWeight: "800",
};

const solutionQuestion = {
  marginTop: "12px",
  fontWeight: "800",
  fontSize: "15px",
  lineHeight: "1.45",
};

const solutionQuestionHi = {
  marginTop: "5px",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#374151",
};

const answerGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "9px",
  marginTop: "12px",
};

const yourAnswerBox = {
  border: "1px solid #e2e8f0",
  borderRadius: "9px",
  padding: "10px",
  background: "#fafafa",
};

const correctAnswerBox = {
  border: "1px solid #bbf7d0",
  borderRadius: "9px",
  padding: "10px",
  background: "#f0fdf4",
};

const answerLabel = {
  fontSize: "9px",
  color: "#667085",
  fontWeight: "800",
  marginBottom: "6px",
  textTransform: "uppercase",
};

const answerLetter = {
  fontWeight: "900",
  marginBottom: "3px",
};

const answerHindi = {
  marginTop: "4px",
  color: "#475569",
  fontSize: "12px",
};

const notAttemptedText = {
  color: "#64748b",
  fontStyle: "italic",
};

const explanationBox = {
  marginTop: "12px",
  padding: "11px",
  borderRadius: "9px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
};

const explanationTitle = {
  fontSize: "10px",
  fontWeight: "900",
  color: "#1d4ed8",
  marginBottom: "5px",
};

const explanationText = {
  lineHeight: "1.55",
  fontSize: "13px",
};

const explanationHindi = {
  marginTop: "7px",
  lineHeight: "1.55",
  fontSize: "13px",
  color: "#374151",
};

const dashboardButton = {
  width: "100%",
  minHeight: "48px",
  background: "#172033",
  color: "#ffffff",
  border: 0,
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "800",
  cursor: "pointer",
};

const centerPage = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  background: "#f5f7fb",
};

const errorCard = {
  maxWidth: "450px",
  width: "100%",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "20px",
  boxShadow:
    "0 5px 20px rgba(0,0,0,0.08)",
};

const primaryButton = {
  marginTop: "16px",
  border: 0,
  background: "#2563eb",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "10px 14px",
  fontWeight: "800",
  cursor: "pointer",
};
