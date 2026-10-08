"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const SECTIONS = [
  {
    name: "General Intelligence & Reasoning",
    hindi: "सामान्य बुद्धिमत्ता एवं तर्कशक्ति",
    short: "Reasoning",
    start: 0,
    end: 49,
    seconds: 30 * 60,
  },
  {
    name: "General Awareness",
    hindi: "सामान्य जागरूकता",
    short: "General Awareness",
    start: 50,
    end: 99,
    seconds: 30 * 60,
  },
  {
    name: "English Language & Comprehension",
    hindi: "अंग्रेजी भाषा एवं बोधगम्यता",
    short: "English",
    start: 100,
    end: 199,
    seconds: 60 * 60,
  },
];

export default function TestPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState({});
  const [visited, setVisited] = useState({});

  const [current, setCurrent] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [sectionTime, setSectionTime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changingSection, setChangingSection] = useState(false);
  const [error, setError] = useState("");

  const [paletteOpen, setPaletteOpen] = useState(false);

  const autoSubmitting = useRef(false);
  const refreshingState = useRef(false);

  const answerKey = `jd_answers_${id}`;
  const reviewKey = `jd_review_${id}`;
  const visitedKey = `jd_visited_${id}`;

  useEffect(() => {
    loadTest();
  }, [id]);

  async function loadTest() {
    setLoading(true);
    setError("");

    const client = supabase();

    const { data: testData, error: testError } =
      await client
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

    if (testError) {
      setError(testError.message);
      setLoading(false);
      return;
    }

    const { data: questionData, error: questionError } =
      await client
        .from("test_questions")
        .select(`
          question_order,
          question_id,
          questions (
            id,
            question_text,
            question_text_hi,
            option_a,
            option_a_hi,
            option_b,
            option_b_hi,
            option_c,
            option_c_hi,
            option_d,
            option_d_hi
          )
        `)
        .eq("test_id", id)
        .order("question_order", {
          ascending: true,
        });

    if (questionError) {
      setError(questionError.message);
      setLoading(false);
      return;
    }

    const loadedQuestions = questionData || [];

    setTest(testData);
    setQuestions(loadedQuestions);

    try {
      const oldAnswers = localStorage.getItem(answerKey);
      const oldReview = localStorage.getItem(reviewKey);
      const oldVisited = localStorage.getItem(visitedKey);

      if (oldAnswers) {
        setAnswers(JSON.parse(oldAnswers));
      }

      if (oldReview) {
        setReview(JSON.parse(oldReview));
      }

      if (oldVisited) {
        setVisited(JSON.parse(oldVisited));
      }
    } catch {
      localStorage.removeItem(answerKey);
      localStorage.removeItem(reviewKey);
      localStorage.removeItem(visitedKey);
    }

    const { data: stateData, error: stateError } =
      await client.rpc("get_test_state", {
        p_test_id: Number(id),
      });

    if (stateError) {
      setError(stateError.message);
      setLoading(false);
      return;
    }

    if (stateData?.status === "submitted") {
      router.replace(`/result/${id}`);
      return;
    }

    const serverSection =
      Number(stateData?.current_section ?? 0);

    const remaining =
      Number(stateData?.remaining_seconds ?? 0);

    setActiveSection(serverSection);
    setSectionTime(remaining);

    const firstQuestion =
      SECTIONS[serverSection].start;

    setCurrent(firstQuestion);

    const q =
      loadedQuestions[firstQuestion]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (
      loading ||
      sectionTime === null ||
      submitting ||
      changingSection
    ) {
      return;
    }

    if (sectionTime <= 0) {
      refreshServerState();
      return;
    }

    const timer = setTimeout(() => {
      setSectionTime((old) =>
        Math.max(0, old - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    sectionTime,
    loading,
    submitting,
    changingSection,
  ]);

  useEffect(() => {
    if (loading) return;

    const syncTimer =
      setInterval(() => {
        refreshServerState(false);
      }, 30000);

    return () =>
      clearInterval(syncTimer);
  }, [
    loading,
    activeSection,
  ]);

  async function refreshServerState(
    moveQuestion = true
  ) {
    if (refreshingState.current) {
      return;
    }

    refreshingState.current = true;

    const { data, error } =
      await supabase().rpc(
        "get_test_state",
        {
          p_test_id: Number(id),
        }
      );

    refreshingState.current = false;

    if (error) {
      setError(error.message);
      return;
    }

    if (data?.status === "submitted") {
      router.replace(`/result/${id}`);
      return;
    }

    const serverSection =
      Number(data?.current_section ?? 0);

    const remaining =
      Number(data?.remaining_seconds ?? 0);

    const expired =
      Boolean(data?.expired);

    if (
      expired &&
      serverSection === 2
    ) {
      setSectionTime(0);

      if (!autoSubmitting.current) {
        autoSubmitting.current = true;
        submitTest(true);
      }

      return;
    }

    const sectionChanged =
      serverSection !== activeSection;

    setActiveSection(serverSection);
    setSectionTime(remaining);

    if (
      sectionChanged &&
      moveQuestion
    ) {
      const firstQuestion =
        SECTIONS[serverSection].start;

      setCurrent(firstQuestion);

      const q =
        questions[firstQuestion]?.questions;

      if (q?.id) {
        markVisited(q.id);
      }
    }
  }

  function markVisited(questionId) {
    setVisited((old) => {
      const updated = {
        ...old,
        [questionId]: true,
      };

      localStorage.setItem(
        visitedKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function goQuestion(index) {
    const section =
      SECTIONS[activeSection];

    if (
      index < section.start ||
      index > section.end
    ) {
      return;
    }

    setCurrent(index);

    const q =
      questions[index]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setPaletteOpen(false);
  }

  function selectAnswer(
    questionId,
    option
  ) {
    setAnswers((old) => {
      const updated = {
        ...old,
        [questionId]: option,
      };

      localStorage.setItem(
        answerKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function clearAnswer(questionId) {
    setAnswers((old) => {
      const updated = { ...old };

      delete updated[questionId];

      localStorage.setItem(
        answerKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function toggleReview(questionId) {
    setReview((old) => {
      const updated = {
        ...old,
        [questionId]:
          !old[questionId],
      };

      localStorage.setItem(
        reviewKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function previousQuestion() {
    const section =
      SECTIONS[activeSection];

    if (current <= section.start) {
      return;
    }

    goQuestion(current - 1);
  }

  function nextQuestion() {
    const section =
      SECTIONS[activeSection];

    if (current >= section.end) {
      return;
    }

    goQuestion(current + 1);
  }

  function markAndNext() {
    const q =
      questions[current]?.questions;

    if (!q?.id) return;

    setReview((old) => {
      const updated = {
        ...old,
        [q.id]: true,
      };

      localStorage.setItem(
        reviewKey,
        JSON.stringify(updated)
      );

      return updated;
    });

    nextQuestion();
  }

  async function manualSubmitSection() {
    if (
      changingSection ||
      submitting
    ) {
      return;
    }

    if (activeSection === 2) {
      submitTest(false);
      return;
    }

    const section =
      SECTIONS[activeSection];

    const sectionQuestions =
      questions.slice(
        section.start,
        section.end + 1
      );

    const answered =
      sectionQuestions.filter(
        (item) =>
          answers[
            item.questions.id
          ]
      ).length;

    const unattempted =
      sectionQuestions.length -
      answered;

    const marked =
      sectionQuestions.filter(
        (item) =>
          review[
            item.questions.id
          ]
      ).length;

    const yes =
      window.confirm(
        `${section.short} section submit करना चाहते हैं?\n\n` +
        `Attempted: ${answered}\n` +
        `Unattempted: ${unattempted}\n` +
        `Marked for Review: ${marked}\n\n` +
        `Submit करने के बाद इस section में वापस नहीं जा सकेंगे।`
      );

    if (!yes) return;

    setChangingSection(true);
    setError("");

    const { data, error } =
      await supabase().rpc(
        "submit_test_section",
        {
          p_test_id: Number(id),
          p_section: activeSection,
        }
      );

    if (error) {
      setChangingSection(false);
      setError(error.message);

      await refreshServerState();
      return;
    }

    const nextSection =
      Number(
        data?.current_section
      );

    const remaining =
      Number(
        data?.remaining_seconds
      );

    setActiveSection(nextSection);
    setSectionTime(remaining);

    const firstQuestion =
      SECTIONS[nextSection].start;

    setCurrent(firstQuestion);

    const q =
      questions[firstQuestion]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setPaletteOpen(false);
    setChangingSection(false);
  }

  async function submitTest(
    automatic = false
  ) {
    if (submitting) return;

    if (!automatic) {
      const attempted =
        Object.keys(answers).length;

      const unattempted =
        questions.length -
        attempted;

      const marked =
        Object.values(review)
          .filter(Boolean).length;

      const yes =
        window.confirm(
          `क्या आप पूरा टेस्ट Submit करना चाहते हैं?\n\n` +
          `Attempted: ${attempted}\n` +
          `Unattempted: ${unattempted}\n` +
          `Marked for Review: ${marked}\n\n` +
          `Submit करने के बाद उत्तर बदले नहीं जा सकेंगे।`
        );

      if (!yes) return;
    }

    setSubmitting(true);
    setError("");

    const { data, error } =
      await supabase().rpc(
        "submit_test",
        {
          p_test_id:
            Number(id),

          p_answers:
            answers,

          p_review:
            review,
        }
      );

    if (error) {
      if (
        error.message
          ?.toLowerCase()
          .includes(
            "already submitted"
          )
      ) {
        router.replace(
          `/result/${id}`
        );

        return;
      }

      setError(
        error.message
      );

      setSubmitting(false);
      autoSubmitting.current = false;

      return;
    }

    sessionStorage.setItem(
      `test_result_${id}`,
      JSON.stringify(data)
    );

    localStorage.removeItem(
      answerKey
    );

    localStorage.removeItem(
      reviewKey
    );

    localStorage.removeItem(
      visitedKey
    );

    router.replace(
      `/result/${id}`
    );
  }

  function formatTime(seconds) {
    if (seconds === null) {
      return "--:--";
    }

    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60
      );

    const secs =
      seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  function paletteStyle(
    questionId
  ) {
    if (review[questionId]) {
      return {
        background: "#7c3aed",
        color: "white",
      };
    }

    if (answers[questionId]) {
      return {
        background: "#16a34a",
        color: "white",
      };
    }

    if (visited[questionId]) {
      return {
        background: "#dc2626",
        color: "white",
      };
    }

    return {
      background: "white",
      color: "#172033",
    };
  }

  if (loading) {
    return (
      <div style={centerPage}>
        Loading test...
      </div>
    );
  }

  if (
    error &&
    !questions.length
  ) {
    return (
      <div style={centerPage}>
        <b>Error:</b> {error}
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={centerPage}>
        No questions found.
      </div>
    );
  }

  const section =
    SECTIONS[activeSection];

  const item =
    questions[current];

  const q =
    item?.questions;

  if (!q) {
    return (
      <div style={centerPage}>
        Question not available.
      </div>
    );
  }

  const sectionQuestions =
    questions.slice(
      section.start,
      section.end + 1
    );

  const sectionAnswered =
    sectionQuestions.filter(
      (item) =>
        answers[
          item.questions.id
        ]
    ).length;

  const sectionMarked =
    sectionQuestions.filter(
      (item) =>
        review[
          item.questions.id
        ]
    ).length;

  const currentLocalNumber =
    current -
    section.start +
    1;

  const options = [
    [
      "A",
      q.option_a,
      q.option_a_hi,
    ],
    [
      "B",
      q.option_b,
      q.option_b_hi,
    ],
    [
      "C",
      q.option_c,
      q.option_c_hi,
    ],
    [
      "D",
      q.option_d,
      q.option_d_hi,
    ],
  ];

  return (
    <div style={pageShell}>

      {/* TOP DARK HEADER */}

      <header style={topBar}>

        <div style={timerBlock}>
          <div style={timerIcon}>
            ◉
          </div>

          <div>
            <div style={timerText}>
              {formatTime(
                sectionTime
              )}
            </div>

            <div style={sectionSmall}>
              {section.short}
            </div>
          </div>
        </div>

        <div style={titleBlock}>
          {test?.title}
        </div>

        <button
          onClick={() =>
            setPaletteOpen(true)
          }
          style={menuButton}
        >
          ☰
        </button>

      </header>

      {/* QUESTION STATUS STRIP */}

      <div style={statusStrip}>

        <div style={questionCircle}>
          {currentLocalNumber}
        </div>

        <div style={statusDivider} />

        <div style={tinyStatus}>
          ✓ {sectionAnswered}
        </div>

        <div style={tinyStatus}>
          🟣 {sectionMarked}
        </div>

        <div
          style={{
            marginLeft: "auto",
            fontSize: "13px",
            color: "#667085",
          }}
        >
          {current + 1}/{questions.length}
        </div>

      </div>

      {/* MAIN QUESTION AREA */}

      <main style={questionArea}>

        <div style={sectionTitle}>
          {section.name}
        </div>

        <div style={sectionHindi}>
          {section.hindi}
        </div>

        <div style={questionNumberText}>
          Question {currentLocalNumber}
        </div>

        <h2 style={questionText}>
          {q.question_text}
        </h2>

        {q.question_text_hi && (
          <div style={questionHindi}>
            {q.question_text_hi}
          </div>
        )}

        <div style={optionsWrap}>
          {options.map(
            ([key, en, hi]) => {
              const selected =
                answers[q.id] === key;

              return (
                <button
                  key={key}

                  onClick={() =>
                    selectAnswer(
                      q.id,
                      key
                    )
                  }

                  style={{
                    ...optionCard,

                    border: selected
                      ? "2px solid #4285f4"
                      : "1px solid #d7dce3",

                    background: selected
                      ? "#eef5ff"
                      : "#ffffff",
                  }}
                >
                  <span style={optionNumber}>
                    {key}
                  </span>

                  <span style={optionContent}>
                    <span style={optionEnglish}>
                      {en}
                    </span>

                    {hi && (
                      <span style={optionHindi}>
                        {hi}
                      </span>
                    )}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        <div style={{ height: "95px" }} />

      </main>

      {/* FIXED BOTTOM BAR */}

      <div style={bottomBar}>

        <button
          onClick={markAndNext}
          style={bottomSecondary}
        >
          Mark & Next
        </button>

        <button
          onClick={() =>
            clearAnswer(q.id)
          }
          style={bottomSecondary}
        >
          Clear
        </button>

        <button
          onClick={nextQuestion}
          disabled={
            current >= section.end
          }
          style={{
            ...bottomPrimary,
            opacity:
              current >= section.end
                ? 0.5
                : 1,
          }}
        >
          Save & Next
        </button>

      </div>

      {/* PALETTE DRAWER */}

      {paletteOpen && (
        <>
          <div
            onClick={() =>
              setPaletteOpen(false)
            }
            style={overlay}
          />

          <aside style={drawer}>

            <div style={drawerHeader}>

              <div>
                <div style={drawerTitle}>
                  Question Palette
                </div>

                <div className="muted">
                  {section.short}
                </div>
              </div>

              <button
                onClick={() =>
                  setPaletteOpen(false)
                }
                style={closeButton}
              >
                ✕
              </button>

            </div>

            <div style={drawerStats}>
              <span>
                Answered:{" "}
                <b>{sectionAnswered}</b>
              </span>

              <span>
                Review:{" "}
                <b>{sectionMarked}</b>
              </span>
            </div>

            <div style={paletteGrid}>
              {sectionQuestions.map(
                (
                  item,
                  localIndex
                ) => {
                  const absoluteIndex =
                    section.start +
                    localIndex;

                  const questionId =
                    item.questions.id;

                  const status =
                    paletteStyle(
                      questionId
                    );

                  return (
                    <button
                      key={questionId}

                      onClick={() =>
                        goQuestion(
                          absoluteIndex
                        )
                      }

                      style={{
                        ...paletteNumber,

                        background:
                          status.background,

                        color:
                          status.color,

                        border:
                          current ===
                          absoluteIndex
                            ? "3px solid #172033"
                            : "1px solid #ccd5e3",
                      }}
                    >
                      {localIndex + 1}
                    </button>
                  );
                }
              )}
            </div>

            <div style={legendBox}>
              <div>
                🟢 Answered
              </div>

              <div>
                🔴 Not Answered
              </div>

              <div>
                🟣 Marked for Review
              </div>

              <div>
                ⚪ Not Visited
              </div>
            </div>

            <div style={submitArea}>

              {activeSection < 2 ? (
                <>
                  <div style={submitTitle}>
                    Submit Current Section
                  </div>

                  <div style={submitInfo}>
                    Attempted:{" "}
                    <b>
                      {sectionAnswered}
                    </b>
                    <br />

                    Unattempted:{" "}
                    <b>
                      {sectionQuestions.length -
                        sectionAnswered}
                    </b>
                    <br />

                    Marked for Review:{" "}
                    <b>
                      {sectionMarked}
                    </b>
                  </div>

                  <button
                    onClick={
                      manualSubmitSection
                    }

                    disabled={
                      changingSection
                    }

                    style={submitButton}
                  >
                    {changingSection
                      ? "Opening Next Section..."
                      : `Submit ${section.short} Section`}
                  </button>
                </>
              ) : (
                <>
                  <div style={submitTitle}>
                    Final Test Submission
                  </div>

                  <div style={submitInfo}>
                    Total Attempted:{" "}
                    <b>
                      {
                        Object.keys(
                          answers
                        ).length
                      }
                    </b>
                    <br />

                    Total Unattempted:{" "}
                    <b>
                      {
                        questions.length -
                        Object.keys(
                          answers
                        ).length
                      }
                    </b>
                    <br />

                    Marked for Review:{" "}
                    <b>
                      {
                        Object.values(
                          review
                        ).filter(
                          Boolean
                        ).length
                      }
                    </b>
                  </div>

                  <button
                    onClick={() =>
                      submitTest(false)
                    }

                    disabled={
                      submitting
                    }

                    style={submitButton}
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Final Test"}
                  </button>
                </>
              )}

            </div>

          </aside>
        </>
      )}

    </div>
  );
}

/* =========================
   STYLES
========================= */

const pageShell = {
  minHeight: "100vh",
  background: "#ffffff",
  color: "#15171a",
};

const topBar = {
  minHeight: "74px",
  background: "#17191d",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 14px",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const timerBlock = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  minWidth: "95px",
};

const timerIcon = {
  width: "34px",
  height: "34px",
  border: "3px solid #ffffff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
};

const timerText = {
  fontSize: "18px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const sectionSmall = {
  fontSize: "11px",
  opacity: 0.72,
  marginTop: "2px",
};

const titleBlock = {
  flex: 1,
  minWidth: 0,
  fontWeight: "700",
  fontSize: "14px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const menuButton = {
  width: "44px",
  height: "44px",
  border: 0,
  background: "transparent",
  color: "#ffffff",
  fontSize: "30px",
  cursor: "pointer",
  flexShrink: 0,
};

const statusStrip = {
  minHeight: "62px",
  borderBottom: "1px solid #e4e7eb",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 18px",
  background: "#ffffff",
  position: "sticky",
  top: "74px",
  zIndex: 40,
};

const questionCircle = {
  width: "44px",
  height: "44px",
  background: "#87939b",
  color: "#ffffff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "700",
  fontSize: "17px",
};

const statusDivider = {
  width: "1px",
  height: "34px",
  background: "#d7dde2",
};

const tinyStatus = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#55606b",
};

const questionArea = {
  maxWidth: "820px",
  margin: "0 auto",
  padding: "22px 18px 0",
};

const sectionTitle = {
  fontSize: "12px",
  color: "#667085",
  fontWeight: "700",
};

const sectionHindi = {
  fontSize: "12px",
  color: "#8a94a0",
  marginTop: "2px",
};

const questionNumberText = {
  marginTop: "18px",
  fontSize: "13px",
  color: "#667085",
  fontWeight: "700",
};

const questionText = {
  fontSize: "21px",
  lineHeight: "1.45",
  margin: "10px 0 8px",
};

const questionHindi = {
  fontSize: "18px",
  lineHeight: "1.55",
  fontWeight: "600",
  marginBottom: "20px",
};

const optionsWrap = {
  display: "grid",
  gap: "12px",
  marginTop: "22px",
};

const optionCard = {
  width: "100%",
  minHeight: "78px",
  borderRadius: "10px",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const optionNumber = {
  width: "34px",
  minWidth: "34px",
  fontSize: "18px",
  fontStyle: "italic",
  color: "#69737d",
  fontWeight: "700",
};

const optionContent = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  flex: 1,
};

const optionEnglish = {
  fontSize: "17px",
  lineHeight: "1.45",
  color: "#202428",
};

const optionHindi = {
  fontSize: "15px",
  lineHeight: "1.45",
  color: "#5f6872",
};

const errorBox = {
  marginTop: "16px",
  padding: "12px",
  borderRadius: "8px",
  background: "#fff1f1",
  color: "#b42318",
};

const bottomBar = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  minHeight: "78px",
  background: "#ffffff",
  borderTop: "1px solid #dfe3e8",
  display: "grid",
  gridTemplateColumns: "1fr 0.8fr 1fr",
  gap: "10px",
  padding: "10px 14px",
  zIndex: 60,
};

const bottomSecondary = {
  minHeight: "52px",
  border: "2px solid #222",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#202124",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
};

const bottomPrimary = {
  minHeight: "52px",
  border: 0,
  borderRadius: "10px",
  background: "#4285f4",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.38)",
  zIndex: 998,
};

const drawer = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(390px, 94vw)",
  height: "100vh",
  background: "#ffffff",
  zIndex: 999,
  padding: "18px",
  overflowY: "auto",
  boxShadow:
    "-8px 0 25px rgba(0,0,0,0.18)",
};

const drawerHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const drawerTitle = {
  fontSize: "20px",
  fontWeight: "800",
};

const closeButton = {
  width: "38px",
  height: "38px",
  borderRadius: "8px",
  border: "1px solid #d7deea",
  background: "#ffffff",
  fontSize: "18px",
  cursor: "pointer",
};

const drawerStats = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: "18px",
  fontSize: "14px",
};

const paletteGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "8px",
  marginTop: "18px",
};

const paletteNumber = {
  minHeight: "42px",
  borderRadius: "7px",
  fontWeight: "700",
  cursor: "pointer",
};

const legendBox = {
  marginTop: "20px",
  lineHeight: "2",
  fontSize: "14px",
};

const submitArea = {
  marginTop: "22px",
  paddingTop: "18px",
  borderTop: "1px solid #d7deea",
};

const submitTitle = {
  fontSize: "17px",
  fontWeight: "800",
  marginBottom: "10px",
};

const submitInfo = {
  padding: "12px",
  background: "#f8fafc",
  border: "1px solid #d7deea",
  borderRadius: "10px",
  lineHeight: "1.8",
  marginBottom: "14px",
};

const submitButton = {
  width: "100%",
  minHeight: "48px",
  border: 0,
  borderRadius: "9px",
  background: "#1769e0",
  color: "#ffffff",
  fontWeight: "800",
  fontSize: "15px",
  cursor: "pointer",
};

const centerPage = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};
