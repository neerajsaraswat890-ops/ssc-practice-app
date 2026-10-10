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

  const [language, setLanguage] = useState("english");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changingSection, setChangingSection] = useState(false);
  const [error, setError] = useState("");

  const [paletteOpen, setPaletteOpen] = useState(false);

  const autoSubmitting = useRef(false);
  const refreshingState = useRef(false);
  const questionScrollRef = useRef(null);

  const answerKey = `jd_answers_${id}`;
  const reviewKey = `jd_review_${id}`;
  const visitedKey = `jd_visited_${id}`;
  const languageKey = `jd_language_${id}`;

  useEffect(() => {
    loadTest();
  }, [id]);

  async function loadTest() {
    setLoading(true);
    setError("");

    const client = supabase();

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

    const loadedQuestions =
      questionData || [];

    setTest(testData);
    setQuestions(loadedQuestions);

    try {
      const oldAnswers =
        localStorage.getItem(answerKey);

      const oldReview =
        localStorage.getItem(reviewKey);

      const oldVisited =
        localStorage.getItem(visitedKey);

      if (oldAnswers) {
        setAnswers(
          JSON.parse(oldAnswers)
        );
      }

      if (oldReview) {
        setReview(
          JSON.parse(oldReview)
        );
      }

      if (oldVisited) {
        setVisited(
          JSON.parse(oldVisited)
        );
      }
    } catch {
      localStorage.removeItem(answerKey);
      localStorage.removeItem(reviewKey);
      localStorage.removeItem(visitedKey);
    }

    const {
      data: stateData,
      error: stateError,
    } = await client.rpc(
      "get_test_state",
      {
        p_test_id: Number(id),
      }
    );

    if (stateError) {
      setError(stateError.message);
      setLoading(false);
      return;
    }

    if (
      stateData?.status ===
      "submitted"
    ) {
      router.replace(
        `/result/${id}`
      );
      return;
    }

    const serverSection =
      Number(
        stateData?.current_section ??
          0
      );

    const remaining =
      Number(
        stateData?.remaining_seconds ??
          0
      );

    setActiveSection(
      serverSection
    );

    setSectionTime(
      remaining
    );

    const firstQuestion =
      SECTIONS[
        serverSection
      ].start;

    setCurrent(
      firstQuestion
    );

    const firstQ =
      loadedQuestions[
        firstQuestion
      ]?.questions;

    if (firstQ?.id) {
      markVisited(
        firstQ.id
      );
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

    if (
      sectionTime <= 0
    ) {
      refreshServerState();
      return;
    }

    const timer =
      setTimeout(() => {
        setSectionTime(
          (old) =>
            Math.max(
              0,
              old - 1
            )
        );
      }, 1000);

    return () =>
      clearTimeout(timer);
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
        refreshServerState(
          false
        );
      }, 30000);

    return () =>
      clearInterval(
        syncTimer
      );
  }, [
    loading,
    activeSection,
  ]);

  async function refreshServerState(
    moveQuestion = true
  ) {
    if (
      refreshingState.current
    ) {
      return;
    }

    refreshingState.current =
      true;

    const {
      data,
      error,
    } = await supabase().rpc(
      "get_test_state",
      {
        p_test_id:
          Number(id),
      }
    );

    refreshingState.current =
      false;

    if (error) {
      setError(
        error.message
      );
      return;
    }

    if (
      data?.status ===
      "submitted"
    ) {
      router.replace(
        `/result/${id}`
      );
      return;
    }

    const serverSection =
      Number(
        data?.current_section ??
          0
      );

    const remaining =
      Number(
        data?.remaining_seconds ??
          0
      );

    const expired =
      Boolean(
        data?.expired
      );

    if (
      expired &&
      serverSection === 2
    ) {
      setSectionTime(0);

      if (
        !autoSubmitting.current
      ) {
        autoSubmitting.current =
          true;

        submitTest(true);
      }

      return;
    }

    const sectionChanged =
      serverSection !==
      activeSection;

    setActiveSection(
      serverSection
    );

    setSectionTime(
      remaining
    );

    if (
      sectionChanged &&
      moveQuestion
    ) {
      const firstQuestion =
        SECTIONS[
          serverSection
        ].start;

      setCurrent(
        firstQuestion
      );

      const q =
        questions[
          firstQuestion
        ]?.questions;

      if (q?.id) {
        markVisited(q.id);
      }

      scrollQuestionToTop();
    }
  }

  function changeLanguage(
    value
  ) {
    if (
      value !== "english" &&
      value !== "hindi"
    ) {
      return;
    }

    setLanguage(value);

    try {
      localStorage.setItem(
        languageKey,
        value
      );
    } catch {
      // Ignore
    }

    scrollQuestionToTop();
  }

  function scrollQuestionToTop() {
    setTimeout(() => {
      questionScrollRef.current?.scrollTo(
        {
          top: 0,
          behavior: "smooth",
        }
      );
    }, 0);
  }

  function markVisited(
    questionId
  ) {
    setVisited(
      (old) => {
        const updated = {
          ...old,
          [questionId]:
            true,
        };

        try {
          localStorage.setItem(
            visitedKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );
  }

  function goQuestion(
    index
  ) {
    const section =
      SECTIONS[
        activeSection
      ];

    if (
      index <
        section.start ||
      index >
        section.end
    ) {
      return;
    }

    setCurrent(index);

    const q =
      questions[
        index
      ]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setPaletteOpen(false);
    scrollQuestionToTop();
  }

  function selectAnswer(
    questionId,
    option
  ) {
    setAnswers(
      (old) => {
        const updated = {
          ...old,
          [questionId]:
            option,
        };

        try {
          localStorage.setItem(
            answerKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );
  }

  function clearAnswer(
    questionId
  ) {
    setAnswers(
      (old) => {
        const updated = {
          ...old,
        };

        delete updated[
          questionId
        ];

        try {
          localStorage.setItem(
            answerKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );
  }

  function nextQuestion() {
    const section =
      SECTIONS[
        activeSection
      ];

    if (
      current >=
      section.end
    ) {
      return;
    }

    goQuestion(
      current + 1
    );
  }

  function markAndNext() {
    const q =
      questions[
        current
      ]?.questions;

    if (!q?.id) return;

    setReview(
      (old) => {
        const updated = {
          ...old,
          [q.id]: true,
        };

        try {
          localStorage.setItem(
            reviewKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );

    nextQuestion();
  }

  async function manualSubmitSection() {
    if (
      changingSection ||
      submitting
    ) {
      return;
    }

    if (
      activeSection === 2
    ) {
      submitTest(false);
      return;
    }

    const section =
      SECTIONS[
        activeSection
      ];

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

    setChangingSection(
      true
    );

    setError("");

    const {
      data,
      error,
    } = await supabase().rpc(
      "submit_test_section",
      {
        p_test_id:
          Number(id),

        p_section:
          activeSection,
      }
    );

    if (error) {
      setChangingSection(
        false
      );

      setError(
        error.message
      );

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

    setActiveSection(
      nextSection
    );

    setSectionTime(
      remaining
    );

    const firstQuestion =
      SECTIONS[
        nextSection
      ].start;

    setCurrent(
      firstQuestion
    );

    const q =
      questions[
        firstQuestion
      ]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setPaletteOpen(false);
    setChangingSection(false);

    scrollQuestionToTop();
  }

  async function submitTest(
    automatic = false
  ) {
    if (submitting) {
      return;
    }

    if (!automatic) {
      const attempted =
        Object.keys(
          answers
        ).length;

      const unattempted =
        questions.length -
        attempted;

      const marked =
        Object.values(
          review
        ).filter(
          Boolean
        ).length;

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

    const {
      data,
      error,
    } = await supabase().rpc(
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

      setSubmitting(
        false
      );

      autoSubmitting.current =
        false;

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

  function formatTime(
    seconds
  ) {
    if (
      seconds === null
    ) {
      return "--:--";
    }

    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) /
          60
      );

    const secs =
      seconds % 60;

    if (hours > 0) {
      return `${String(
        hours
      ).padStart(
        2,
        "0"
      )}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        secs
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      secs
    ).padStart(
      2,
      "0"
    )}`;
  }

  function paletteStyle(
    questionId
  ) {
    if (
      review[
        questionId
      ]
    ) {
      return {
        background:
          "#7c3aed",
        color: "white",
      };
    }

    if (
      answers[
        questionId
      ]
    ) {
      return {
        background:
          "#16a34a",
        color: "white",
      };
    }

    if (
      visited[
        questionId
      ]
    ) {
      return {
        background:
          "#dc2626",
        color: "white",
      };
    }

    return {
      background:
        "#ffffff",
      color:
        "#172033",
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
        <b>Error:</b>{" "}
        {error}
      </div>
    );
  }

  if (
    !questions.length
  ) {
    return (
      <div style={centerPage}>
        No questions found.
      </div>
    );
  }

  const section =
    SECTIONS[
      activeSection
    ];

  const item =
    questions[
      current
    ];

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

  const displayQuestion =
    language === "hindi"
      ? q.question_text_hi ||
        q.question_text
      : q.question_text;

  const options = [
    {
      key: "A",
      text:
        language === "hindi"
          ? q.option_a_hi ||
            q.option_a
          : q.option_a,
    },
    {
      key: "B",
      text:
        language === "hindi"
          ? q.option_b_hi ||
            q.option_b
          : q.option_b,
    },
    {
      key: "C",
      text:
        language === "hindi"
          ? q.option_c_hi ||
            q.option_c
          : q.option_c,
    },
    {
      key: "D",
      text:
        language === "hindi"
          ? q.option_d_hi ||
            q.option_d
          : q.option_d,
    },
  ];

  return (
    <div style={pageShell}>

      {/* HEADER */}

      <header style={topBar}>

        <div style={timerBlock}>
          <div style={timerIcon}>
            ◷
          </div>

          <div>
            <div style={timerText}>
              {formatTime(
                sectionTime
              )}
            </div>

            <div style={timerLabel}>
              Time Left
            </div>
          </div>
        </div>

        <div style={headerMiddle}>

          <div style={testTitle}>
            {test?.title}
          </div>

          <select
            value={language}
            onChange={(e) =>
              changeLanguage(
                e.target.value
              )
            }
            style={headerLanguageSelect}
            aria-label="Change default language"
          >
            <option value="english">
              English
            </option>

            <option value="hindi">
              हिन्दी
            </option>
          </select>

        </div>

        <button
          type="button"
          onClick={() =>
            setPaletteOpen(
              true
            )
          }
          style={menuButton}
          aria-label="Open question palette"
        >
          ☰
        </button>

      </header>

      {/* STATUS BAR */}

      <div style={statusStrip}>

        <div style={questionCircle}>
          {currentLocalNumber}
        </div>

        <div style={statusTextBlock}>
          <div style={sectionName}>
            {language === "hindi"
              ? section.hindi
              : section.name}
          </div>

          <div style={statusMini}>
            Answered{" "}
            <b>
              {sectionAnswered}
            </b>
            {" · "}
            Review{" "}
            <b>
              {sectionMarked}
            </b>
          </div>
        </div>

        <div style={overallCount}>
          {current + 1}/
          {questions.length}
        </div>

      </div>

      {/* SCROLLABLE QUESTION AREA */}

      <main
        ref={questionScrollRef}
        style={questionScrollArea}
      >

        <div style={questionInner}>

          <div style={questionMeta}>
            {language === "hindi"
              ? `प्रश्न ${currentLocalNumber}`
              : `Question ${currentLocalNumber}`}
          </div>

          <div style={questionText}>
            {displayQuestion}
          </div>

          <div style={optionsWrap}>

            {options.map(
              (option) => {
                const selected =
                  answers[
                    q.id
                  ] ===
                  option.key;

                return (
                  <button
                    type="button"
                    key={
                      option.key
                    }
                    onClick={() =>
                      selectAnswer(
                        q.id,
                        option.key
                      )
                    }
                    style={{
                      ...optionCard,

                      ...(selected
                        ? selectedOption
                        : {}),
                    }}
                  >

                    <span
                      style={{
                        ...optionLetter,

                        ...(selected
                          ? selectedOptionLetter
                          : {}),
                      }}
                    >
                      {option.key}
                    </span>

                    <span style={optionText}>
                      {option.text}
                    </span>

                    <span
                      style={{
                        ...radioMark,

                        ...(selected
                          ? selectedRadio
                          : {}),
                      }}
                    >
                      {selected
                        ? "✓"
                        : ""}
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

        </div>

      </main>

      {/* BOTTOM ACTION BAR */}

      <div style={bottomBar}>

        <button
          type="button"
          onClick={
            markAndNext
          }
          style={markButton}
        >
          <span style={buttonMainText}>
            Mark & Next
          </span>

          <span style={buttonSubText}>
            Review
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            clearAnswer(
              q.id
            )
          }
          style={clearButton}
        >
          <span style={buttonMainText}>
            Clear
          </span>

          <span style={buttonSubText}>
            Response
          </span>
        </button>

        <button
          type="button"
          onClick={
            nextQuestion
          }
          disabled={
            current >=
            section.end
          }
          style={{
            ...saveNextButton,

            opacity:
              current >=
              section.end
                ? 0.5
                : 1,
          }}
        >
          <span style={buttonMainText}>
            Save & Next
          </span>

          <span style={buttonSubText}>
            Next Question
          </span>
        </button>

      </div>

      {/* QUESTION PALETTE */}

      {paletteOpen && (
        <>
          <div
            style={overlay}
            onClick={() =>
              setPaletteOpen(
                false
              )
            }
          />

          <aside style={drawer}>

            <div style={drawerHeader}>

              <div>
                <div style={drawerTitle}>
                  Question Palette
                </div>

                <div style={drawerSubtitle}>
                  {language === "hindi"
                    ? section.hindi
                    : section.name}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaletteOpen(
                    false
                  )
                }
                style={closeButton}
              >
                ✕
              </button>

            </div>

            <div style={drawerStats}>

              <span>
                Answered{" "}
                <b>
                  {sectionAnswered}
                </b>
              </span>

              <span>
                Review{" "}
                <b>
                  {sectionMarked}
                </b>
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
                      type="button"
                      key={
                        questionId
                      }
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
                            ? "2px solid #111827"
                            : "1px solid #cbd5e1",
                      }}
                    >
                      {localIndex +
                        1}
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
                🟣 Review
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

                    <span>
                      Attempted{" "}
                      <b>
                        {sectionAnswered}
                      </b>
                    </span>

                    <span>
                      Unattempted{" "}
                      <b>
                        {sectionQuestions.length -
                          sectionAnswered}
                      </b>
                    </span>

                    <span>
                      Review{" "}
                      <b>
                        {sectionMarked}
                      </b>
                    </span>

                  </div>

                  <button
                    type="button"
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

                    <span>
                      Attempted{" "}
                      <b>
                        {
                          Object.keys(
                            answers
                          ).length
                        }
                      </b>
                    </span>

                    <span>
                      Unattempted{" "}
                      <b>
                        {
                          questions.length -
                          Object.keys(
                            answers
                          ).length
                        }
                      </b>
                    </span>

                    <span>
                      Review{" "}
                      <b>
                        {
                          Object.values(
                            review
                          ).filter(
                            Boolean
                          ).length
                        }
                      </b>
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      submitTest(
                        false
                      )
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

/* ===============================
   RESPONSIVE EXAM UI STYLES
================================ */

const pageShell = {
  height: "100dvh",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "#f8fafc",
  color: "#111827",
};

const topBar = {
  flexShrink: 0,
  minHeight: "66px",
  background: "#17191d",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding:
    "8px max(10px, env(safe-area-inset-left))",
  paddingRight:
    "max(10px, env(safe-area-inset-right))",
  zIndex: 50,
};

const timerBlock = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
};

const timerIcon = {
  width: "28px",
  height: "28px",
  border: "2px solid #ffffff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
};

const timerText = {
  fontSize: "16px",
  fontWeight: "800",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};

const timerLabel = {
  fontSize: "9px",
  opacity: 0.72,
  marginTop: "2px",
};

const headerMiddle = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  alignItems: "center",
};

const testTitle = {
  width: "100%",
  textAlign: "center",
  fontSize: "12px",
  fontWeight: "700",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const headerLanguageSelect = {
  width: "118px",
  maxWidth: "100%",
  height: "26px",
  border: "1px solid #71717a",
  borderRadius: "6px",
  background: "#27272a",
  color: "#ffffff",
  padding: "0 6px",
  fontSize: "11px",
  fontWeight: "700",
  outline: "none",
};

const menuButton = {
  width: "40px",
  height: "40px",
  flexShrink: 0,
  border: 0,
  borderRadius: "8px",
  background: "transparent",
  color: "#ffffff",
  fontSize: "27px",
  cursor: "pointer",
};

const statusStrip = {
  flexShrink: 0,
  minHeight: "52px",
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "6px 12px",
};

const questionCircle = {
  width: "38px",
  height: "38px",
  minWidth: "38px",
  borderRadius: "50%",
  background: "#64748b",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  fontSize: "15px",
};

const statusTextBlock = {
  minWidth: 0,
  flex: 1,
};

const sectionName = {
  fontSize: "12px",
  fontWeight: "800",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const statusMini = {
  fontSize: "10px",
  marginTop: "3px",
  color: "#64748b",
};

const overallCount = {
  flexShrink: 0,
  fontSize: "11px",
  fontWeight: "700",
  color: "#64748b",
};

const questionScrollArea = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
};

const questionInner = {
  width: "100%",
  maxWidth: "800px",
  margin: "0 auto",
  padding: "12px 12px 18px",
};

const questionMeta = {
  fontSize: "11px",
  fontWeight: "800",
  color: "#64748b",
  marginBottom: "7px",
};

const questionText = {
  fontSize: "clamp(16px, 4.3vw, 21px)",
  lineHeight: "1.42",
  fontWeight: "700",
  color: "#111827",
  marginBottom: "14px",
};

const optionsWrap = {
  display: "grid",
  gap: "8px",
};

const optionCard = {
  width: "100%",
  minHeight: "52px",
  border: "1px solid #d7dce3",
  borderRadius: "9px",
  background: "#ffffff",
  padding: "9px 10px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const selectedOption = {
  border: "2px solid #2563eb",
  background: "#eff6ff",
};

const optionLetter = {
  width: "30px",
  height: "30px",
  minWidth: "30px",
  borderRadius: "50%",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "800",
  fontSize: "13px",
  color: "#475569",
};

const selectedOptionLetter = {
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
};

const optionText = {
  flex: 1,
  fontSize: "clamp(14px, 3.8vw, 17px)",
  lineHeight: "1.35",
  color: "#1f2937",
};

const radioMark = {
  width: "22px",
  height: "22px",
  minWidth: "22px",
  borderRadius: "50%",
  border: "2px solid #cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  color: "#ffffff",
};

const selectedRadio = {
  background: "#2563eb",
  border: "2px solid #2563eb",
};

const errorBox = {
  marginTop: "10px",
  padding: "9px",
  background: "#fef2f2",
  borderRadius: "7px",
  color: "#b91c1c",
  fontSize: "12px",
};

const bottomBar = {
  flexShrink: 0,
  minHeight: "68px",
  background: "#ffffff",
  borderTop: "1px solid #dfe3e8",
  display: "grid",
  gridTemplateColumns: "1fr 0.72fr 1fr",
  gap: "7px",
  padding:
    "7px 9px max(7px, env(safe-area-inset-bottom))",
  zIndex: 60,
};

const actionBase = {
  minHeight: "50px",
  borderRadius: "8px",
  fontFamily: "inherit",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  lineHeight: 1.1,
};

const markButton = {
  ...actionBase,
  border: "1px solid #7c3aed",
  background: "#ffffff",
  color: "#6d28d9",
};

const clearButton = {
  ...actionBase,
  border: "1px solid #475569",
  background: "#ffffff",
  color: "#334155",
};

const saveNextButton = {
  ...actionBase,
  border: 0,
  background: "#2563eb",
  color: "#ffffff",
};

const buttonMainText = {
  fontSize: "12px",
  fontWeight: "800",
};

const buttonSubText = {
  fontSize: "9px",
  marginTop: "3px",
  opacity: 0.75,
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.42)",
  zIndex: 998,
};

const drawer = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(350px, 92vw)",
  height: "100dvh",
  background: "#ffffff",
  zIndex: 999,
  padding: "12px",
  overflowY: "auto",
  boxShadow:
    "-8px 0 25px rgba(0,0,0,0.18)",
};

const drawerHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const drawerTitle = {
  fontSize: "17px",
  fontWeight: "800",
};

const drawerSubtitle = {
  maxWidth: "250px",
  marginTop: "2px",
  fontSize: "10px",
  color: "#64748b",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const closeButton = {
  width: "32px",
  height: "32px",
  minWidth: "32px",
  borderRadius: "7px",
  border: "1px solid #d7deea",
  background: "#ffffff",
  fontSize: "15px",
  cursor: "pointer",
};

const drawerStats = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginTop: "9px",
  padding: "7px 8px",
  borderRadius: "7px",
  background: "#f8fafc",
  fontSize: "11px",
};

const paletteGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(7, 1fr)",
  gap: "5px",
  marginTop: "10px",
};

const paletteNumber = {
  minHeight: "30px",
  padding: "2px",
  borderRadius: "5px",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
};

const legendBox = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "3px 6px",
  marginTop: "10px",
  fontSize: "10px",
  lineHeight: "1.45",
};

const submitArea = {
  marginTop: "10px",
  paddingTop: "10px",
  borderTop: "1px solid #e2e8f0",
};

const submitTitle = {
  fontSize: "14px",
  fontWeight: "800",
  marginBottom: "7px",
};

const submitInfo = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px 12px",
  padding: "7px 8px",
  marginBottom: "8px",
  background: "#f8fafc",
  borderRadius: "7px",
  fontSize: "10px",
};

const submitButton = {
  width: "100%",
  minHeight: "42px",
  border: 0,
  borderRadius: "8px",
  background: "#1769e0",
  color: "#ffffff",
  fontWeight: "800",
  fontSize: "13px",
  cursor: "pointer",
};

const centerPage = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};
