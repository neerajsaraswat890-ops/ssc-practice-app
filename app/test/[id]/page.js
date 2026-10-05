"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const SECTIONS = [
  {
    key: "reasoning",
    name: "General Intelligence & Reasoning",
    shortName: "Reasoning",
    start: 0,
    end: 49,
    duration: 30 * 60,
  },
  {
    key: "ga",
    name: "General Awareness",
    shortName: "General Awareness",
    start: 50,
    end: 99,
    duration: 30 * 60,
  },
  {
    key: "english",
    name: "English Language & Comprehension",
    shortName: "English",
    start: 100,
    end: 199,
    duration: 60 * 60,
  },
];

export default function Test() {
  const { id } = useParams();
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [visited, setVisited] = useState({});
  const [testInfo, setTestInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState(0);
  const [sectionTimeLeft, setSectionTimeLeft] = useState(null);
  const [totalTimeLeft, setTotalTimeLeft] = useState(null);

  const autoSubmitted = useRef(false);
  const sectionSwitching = useRef(false);

  const answersKey = `jd_answers_${id}`;
  const reviewKey = `jd_review_${id}`;
  const visitedKey = `jd_visited_${id}`;
  const startKey = `jd_test_start_${id}`;

  useEffect(() => {
    async function loadTest() {
      setLoading(true);
      setError("");

      const client = supabase();

      const [
        { data: questionData, error: questionError },
        { data: testData, error: testError },
      ] = await Promise.all([
        client
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
          .order("question_order"),

        client
          .from("tests")
          .select(`
            id,
            title,
            duration_minutes,
            attempt_until,
            negative_mark,
            status
          `)
          .eq("id", id)
          .single(),
      ]);

      if (questionError) {
        setError(questionError.message);
        setLoading(false);
        return;
      }

      if (testError) {
        setError(testError.message);
        setLoading(false);
        return;
      }

      if (
        testData.attempt_until &&
        new Date(testData.attempt_until).getTime() < Date.now()
      ) {
        setError("This test is no longer available for attempts.");
        setLoading(false);
        return;
      }

      const loadedQuestions = questionData || [];

      setQuestions(loadedQuestions);
      setTestInfo(testData);

      try {
        const savedAnswers = localStorage.getItem(answersKey);
        if (savedAnswers) {
          setAnswers(JSON.parse(savedAnswers));
        }

        const savedReview = localStorage.getItem(reviewKey);
        if (savedReview) {
          setReviewed(JSON.parse(savedReview));
        }

        const savedVisited = localStorage.getItem(visitedKey);
        if (savedVisited) {
          setVisited(JSON.parse(savedVisited));
        }
      } catch {
        localStorage.removeItem(answersKey);
        localStorage.removeItem(reviewKey);
        localStorage.removeItem(visitedKey);
      }

      let startedAt = localStorage.getItem(startKey);

      if (!startedAt) {
        startedAt = String(Date.now());
        localStorage.setItem(startKey, startedAt);
      }

      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - Number(startedAt)) / 1000)
      );

      let sectionIndex = 0;
      let sectionElapsed = elapsedSeconds;

      if (elapsedSeconds >= 3600) {
        sectionIndex = 2;
        sectionElapsed = elapsedSeconds - 3600;
      } else if (elapsedSeconds >= 1800) {
        sectionIndex = 1;
        sectionElapsed = elapsedSeconds - 1800;
      }

      const totalRemaining = Math.max(
        0,
        7200 - elapsedSeconds
      );

      const sectionDuration =
        SECTIONS[sectionIndex].duration;

      const sectionRemaining = Math.max(
        0,
        sectionDuration - sectionElapsed
      );

      setActiveSection(sectionIndex);
      setSectionTimeLeft(sectionRemaining);
      setTotalTimeLeft(totalRemaining);

      const firstIndex = SECTIONS[sectionIndex].start;
      setCurrent(firstIndex);

      if (loadedQuestions[firstIndex]) {
        const questionId =
          loadedQuestions[firstIndex].questions.id;

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

      setLoading(false);
    }

    loadTest();
  }, [id]);

  useEffect(() => {
    if (
      loading ||
      submitting ||
      sectionTimeLeft === null ||
      totalTimeLeft === null
    ) {
      return;
    }

    if (totalTimeLeft <= 0) {
      if (!autoSubmitted.current && questions.length) {
        autoSubmitted.current = true;
        submitTest(true);
      }
      return;
    }

    if (sectionTimeLeft <= 0) {
      moveToNextSection();
      return;
    }

    const timer = setTimeout(() => {
      setSectionTimeLeft((old) =>
        old === null ? old : Math.max(0, old - 1)
      );

      setTotalTimeLeft((old) =>
        old === null ? old : Math.max(0, old - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    sectionTimeLeft,
    totalTimeLeft,
    loading,
    submitting,
    questions.length,
  ]);

  function markVisited(index) {
    const item = questions[index];

    if (!item) return;

    const questionId = item.questions.id;

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

  function goToQuestion(index) {
    const section = SECTIONS[activeSection];

    if (index < section.start || index > section.end) {
      return;
    }

    setCurrent(index);
    markVisited(index);
  }

  function selectAnswer(questionId, option) {
    setAnswers((old) => {
      const updated = {
        ...old,
        [questionId]: option,
      };

      localStorage.setItem(
        answersKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function clearResponse(questionId) {
    setAnswers((old) => {
      const updated = { ...old };

      delete updated[questionId];

      localStorage.setItem(
        answersKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function toggleReview(questionId) {
    setReviewed((old) => {
      const updated = {
        ...old,
        [questionId]: !old[questionId],
      };

      localStorage.setItem(
        reviewKey,
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function saveAndNext() {
    const section = SECTIONS[activeSection];

    if (current < section.end) {
      const nextIndex = current + 1;
      setCurrent(nextIndex);
      markVisited(nextIndex);
    }
  }

  function previousQuestion() {
    const section = SECTIONS[activeSection];

    if (current > section.start) {
      const previousIndex = current - 1;
      setCurrent(previousIndex);
      markVisited(previousIndex);
    }
  }

  function moveToNextSection() {
    if (sectionSwitching.current) return;

    sectionSwitching.current = true;

    if (activeSection >= SECTIONS.length - 1) {
      if (!autoSubmitted.current) {
        autoSubmitted.current = true;
        submitTest(true);
      }

      return;
    }

    const nextSection = activeSection + 1;
    const nextSectionData = SECTIONS[nextSection];

    setActiveSection(nextSection);
    setSectionTimeLeft(nextSectionData.duration);
    setCurrent(nextSectionData.start);

    markVisited(nextSectionData.start);

    setTimeout(() => {
      sectionSwitching.current = false;
    }, 500);
  }

  function manuallySubmitSection() {
    if (activeSection >= SECTIONS.length - 1) {
      submitTest(false);
      return;
    }

    const sectionName =
      SECTIONS[activeSection].shortName;

    const confirmed = window.confirm(
      `Are you sure you want to submit ${sectionName} section?\n\nOnce submitted, you cannot return to this section.`
    );

    if (!confirmed) return;

    moveToNextSection();
  }

  async function submitTest(auto = false) {
    if (submitting) return;

    if (!auto) {
      const answeredCount =
        Object.keys(answers).length;

      const confirmed = window.confirm(
        `Are you sure you want to submit the test?\n\nAttempted: ${answeredCount}\nUnattempted: ${
          questions.length - answeredCount
        }`
      );

      if (!confirmed) return;
    }

    setSubmitting(true);
    setError("");

    const { data, error } = await supabase().rpc(
      "submit_test",
      {
        p_test_id: Number(id),
        p_answers: answers,
      }
    );

    if (error) {
      setError(error.message);
      setSubmitting(false);
      autoSubmitted.current = false;
      return;
    }

    sessionStorage.setItem(
      `test_result_${id}`,
      JSON.stringify(data)
    );

    localStorage.removeItem(answersKey);
    localStorage.removeItem(reviewKey);
    localStorage.removeItem(visitedKey);
    localStorage.removeItem(startKey);

    router.push(`/result/${id}`);
  }

  function formatTime(totalSeconds) {
    if (totalSeconds === null) {
      return "--:--";
    }

    const minutes = Math.floor(
      totalSeconds / 60
    );

    const seconds =
      totalSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  function getQuestionStatus(questionId, index) {
    if (reviewed[questionId]) {
      return {
        background: "#7c3aed",
        color: "#ffffff",
      };
    }

    if (answers[questionId]) {
      return {
        background: "#22c55e",
        color: "#ffffff",
      };
    }

    if (visited[questionId]) {
      return {
        background: "#ef4444",
        color: "#ffffff",
      };
    }

    if (current === index) {
      return {
        background: "#2563eb",
        color: "#ffffff",
      };
    }

    return {
      background: "#ffffff",
      color: "#172033",
    };
  }

  if (loading) {
    return (
      <>
        <div className="nav">
          JD Exambook • Test
        </div>

        <main className="wrap">
          <div className="card">
            Loading test...
          </div>
        </main>
      </>
    );
  }

  if (error && !questions.length) {
    return (
      <>
        <div className="nav">
          JD Exambook • Test
        </div>

        <main className="wrap">
          <div className="card">
            <b>Error:</b> {error}
          </div>
        </main>
      </>
    );
  }

  if (!questions.length) {
    return (
      <>
        <div className="nav">
          JD Exambook • Test
        </div>

        <main className="wrap">
          <div className="card">
            No questions have been assigned to this test.
          </div>
        </main>
      </>
    );
  }

  const section = SECTIONS[activeSection];

  const row = questions[current];
  const q = row?.questions;

  if (!q) {
    return (
      <>
        <div className="nav">
          JD Exambook • Test
        </div>

        <main className="wrap">
          <div className="card">
            Question could not be loaded.
          </div>
        </main>
      </>
    );
  }

  const options = {
    A: {
      en: q.option_a,
      hi: q.option_a_hi,
    },
    B: {
      en: q.option_b,
      hi: q.option_b_hi,
    },
    C: {
      en: q.option_c,
      hi: q.option_c_hi,
    },
    D: {
      en: q.option_d,
      hi: q.option_d_hi,
    },
  };

  const activeSectionQuestions =
    questions.slice(
      section.start,
      section.end + 1
    );

  const sectionAnswered =
    activeSectionQuestions.filter(
      (item) =>
        answers[item.questions.id]
    ).length;

  const totalAnswered =
    Object.keys(answers).length;

  return (
    <>
      <div className="nav">
        JD Exambook • Test
      </div>

      <main className="wrap">

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <b>
                {testInfo?.title ||
                  `Test #${id}`}
              </b>

              <div
                className="muted"
                style={{
                  marginTop: "5px",
                }}
              >
                {section.name}
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#667085",
                }}
              >
                Section Time
              </div>

              <div
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                }}
              >
                ⏱ {formatTime(sectionTimeLeft)}
              </div>

              <div
                className="muted"
                style={{
                  fontSize: "13px",
                  marginTop: "5px",
                }}
              >
                Total Left:{" "}
                {formatTime(totalTimeLeft)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
            }}
          >
            {SECTIONS.map((item, index) => {
              const completed =
                index < activeSection;

              const active =
                index === activeSection;

              return (
                <div
                  key={item.key}
                  style={{
                    minWidth: "130px",
                    padding: "10px",
                    borderRadius: "9px",
                    textAlign: "center",
                    fontWeight: "700",
                    background: active
                      ? "#1769e0"
                      : completed
                      ? "#e5e7eb"
                      : "#f8fafc",
                    color: active
                      ? "#ffffff"
                      : completed
                      ? "#777"
                      : "#172033",
                    border:
                      "1px solid #d7deea",
                  }}
                >
                  {item.shortName}

                  {completed && (
                    <div
                      style={{
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      LOCKED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="top">
            <div>
              <b>
                Question{" "}
                {current -
                  section.start +
                  1}{" "}
                /{" "}
                {section.end -
                  section.start +
                  1}
              </b>

              <div className="muted">
                Overall Question {current + 1} /{" "}
                {questions.length}
              </div>
            </div>

            <span className="muted">
              Section Answered:{" "}
              {sectionAnswered}
            </span>
          </div>

          <h3
            style={{
              marginTop: "24px",
            }}
          >
            {q.question_text}
          </h3>

          {q.question_text_hi && (
            <p
              style={{
                fontSize: "19px",
                fontWeight: "600",
                lineHeight: "1.5",
                marginTop: "8px",
              }}
            >
              {q.question_text_hi}
            </p>
          )}

          <div className="options">
            {Object.entries(options).map(
              ([key, value]) => (
                <label key={key}>
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    checked={
                      answers[q.id] === key
                    }
                    onChange={() =>
                      selectAnswer(q.id, key)
                    }
                  />{" "}

                  <b>{key}.</b> {value.en}

                  {value.hi && (
                    <div
                      style={{
                        marginLeft: "26px",
                        marginTop: "4px",
                        fontSize: "16px",
                        color: "#555",
                      }}
                    >
                      {value.hi}
                    </div>
                  )}
                </label>
              )
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <button
              className="btn btn2"
              onClick={() =>
                clearResponse(q.id)
              }
            >
              Clear Response
            </button>

            <button
              className="btn btn2"
              onClick={() =>
                toggleReview(q.id)
              }
            >
              {reviewed[q.id]
                ? "Remove Review"
                : "Mark for Review"}
            </button>
          </div>

          {error && (
            <p
              style={{
                color: "red",
                marginTop: "15px",
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <button
              className="btn btn2"
              disabled={
                current === section.start
              }
              onClick={previousQuestion}
            >
              Previous
            </button>

            {current < section.end ? (
              <button
                className="btn"
                onClick={saveAndNext}
              >
                Save & Next
              </button>
            ) : (
              <button
                className="btn"
                onClick={manuallySubmitSection}
              >
                {activeSection ===
                SECTIONS.length - 1
                  ? "Submit Test"
                  : "Submit Section"}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="top">
            <div>
              <b>
                {section.shortName} Palette
              </b>

              <div className="muted">
                Section {activeSection + 1} of 3
              </div>
            </div>

            <div>
              {sectionAnswered} /{" "}
              {activeSectionQuestions.length}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(48px, 1fr))",
              gap: "8px",
              marginTop: "18px",
            }}
          >
            {activeSectionQuestions.map(
              (item, localIndex) => {
                const absoluteIndex =
                  section.start +
                  localIndex;

                const questionId =
                  item.questions.id;

                const status =
                  getQuestionStatus(
                    questionId,
                    absoluteIndex
                  );

                return (
                  <button
                    key={questionId}
                    onClick={() =>
                      goToQuestion(
                        absoluteIndex
                      )
                    }
                    style={{
                      padding: "11px 6px",
                      borderRadius: "8px",
                      border:
                        current ===
                        absoluteIndex
                          ? "3px solid #172033"
                          : "1px solid #ccd5e3",
                      fontWeight: "700",
                      cursor: "pointer",
                      background:
                        status.background,
                      color: status.color,
                    }}
                  >
                    {localIndex + 1}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              marginTop: "20px",
              fontSize: "14px",
              lineHeight: "2",
            }}
          >
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
        </div>

        <div className="card">
          <b>Overall Progress</b>

          <p className="muted">
            Answered: {totalAnswered} /{" "}
            {questions.length}
          </p>

          <p className="muted">
            Current Section: {section.name}
          </p>

          <button
            className="btn"
            onClick={manuallySubmitSection}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: "10px",
            }}
          >
            {submitting
              ? "Submitting..."
              : activeSection ===
                SECTIONS.length - 1
              ? "Submit Final Test"
              : "Submit Current Section"}
          </button>
        </div>

      </main>
    </>
  );
}
