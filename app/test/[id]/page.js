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
      const oldAnswers =
        localStorage.getItem(answerKey);

      const oldReview =
        localStorage.getItem(reviewKey);

      const oldVisited =
        localStorage.getItem(visitedKey);

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
      await client.rpc(
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
      loadedQuestions[firstQuestion]
        ?.questions;

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
      Number(
        data?.current_section ?? 0
      );

    const remaining =
      Number(
        data?.remaining_seconds ?? 0
      );

    const expired =
      Boolean(data?.expired);

    if (expired && serverSection === 2) {
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
        questions[firstQuestion]
          ?.questions;

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
      const updated = {
        ...old,
      };

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

    if (
      current <= section.start
    ) {
      return;
    }

    goQuestion(current - 1);
  }

  function nextQuestion() {
    const section =
      SECTIONS[activeSection];

    if (
      current >= section.end
    ) {
      return;
    }

    goQuestion(current + 1);
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

    if (
      data?.status ===
      "final_section"
    ) {
      setChangingSection(false);
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
      questions[firstQuestion]
        ?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    setChangingSection(false);
  }

  async function submitTest(
    automatic = false
  ) {
    if (submitting) return;

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
        ).filter(Boolean).length;

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

      setError(error.message);
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

    const minutes =
      Math.floor(
        seconds / 60
      );

    const secs =
      seconds % 60;

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
      <>
        <div className="nav">
          JD Exambook • Examination
        </div>

        <main className="wrap">
          <div className="card">
            Loading test...
          </div>
        </main>
      </>
    );
  }

  if (
    error &&
    !questions.length
  ) {
    return (
      <>
        <div className="nav">
          JD Exambook
        </div>

        <main className="wrap">
          <div className="card">
            <b>Error:</b>{" "}
            {error}
          </div>
        </main>
      </>
    );
  }

  if (!questions.length) {
    return (
      <>
        <div className="nav">
          JD Exambook
        </div>

        <main className="wrap">
          <div className="card">
            No questions found.
          </div>
        </main>
      </>
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
      <main className="wrap">
        <div className="card">
          Question not available.
        </div>
      </main>
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
    <>
      <div className="nav">
        JD Exambook • Examination
      </div>

      <main className="wrap">

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <b>
                {test?.title}
              </b>

              <div
                style={{
                  marginTop: "6px",
                  fontWeight: "700",
                }}
              >
                {section.name}
              </div>

              <div className="muted">
                {section.hindi}
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <div className="muted">
                Section Time Left
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "800",
                }}
              >
                {formatTime(
                  sectionTime
                )}
              </div>

              <div
                className="muted"
                style={{
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Server controlled timer
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: "8px",
            }}
          >
            {SECTIONS.map(
              (s, index) => (
                <div
                  key={s.short}
                  style={{
                    padding:
                      "10px 5px",

                    borderRadius:
                      "8px",

                    textAlign:
                      "center",

                    fontWeight:
                      "700",

                    border:
                      "1px solid #d7deea",

                    background:
                      index ===
                      activeSection
                        ? "#1769e0"
                        : index <
                          activeSection
                        ? "#e5e7eb"
                        : "#f8fafc",

                    color:
                      index ===
                      activeSection
                        ? "white"
                        : "#172033",
                  }}
                >
                  {s.short}

                  {index <
                    activeSection && (
                    <div
                      style={{
                        fontSize:
                          "11px",
                        marginTop:
                          "4px",
                      }}
                    >
                      🔒 LOCKED
                    </div>
                  )}
                </div>
              )
            )}
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
                of{" "}
                {section.end -
                  section.start +
                  1}
              </b>

              <div className="muted">
                Overall Question{" "}
                {current + 1} /{" "}
                {questions.length}
              </div>
            </div>

            <div>
              <div>
                Answered:{" "}
                {sectionAnswered}
              </div>

              <div className="muted">
                Review:{" "}
                {sectionMarked}
              </div>
            </div>
          </div>

          <h3
            style={{
              lineHeight: "1.5",
              marginTop: "24px",
            }}
          >
            {q.question_text}
          </h3>

          {q.question_text_hi && (
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                lineHeight: "1.6",
                marginBottom: "18px",
              }}
            >
              {q.question_text_hi}
            </div>
          )}

          <div className="options">
            {options.map(
              ([
                key,
                en,
                hi,
              ]) => (
                <label key={key}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}

                    checked={
                      answers[
                        q.id
                      ] === key
                    }

                    onChange={() =>
                      selectAnswer(
                        q.id,
                        key
                      )
                    }
                  />

                  {" "}

                  <b>
                    {key}.
                  </b>{" "}

                  {en}

                  {hi && (
                    <div
                      style={{
                        marginLeft:
                          "25px",

                        marginTop:
                          "5px",

                        color:
                          "#555",
                      }}
                    >
                      {hi}
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
              marginTop: "15px",
            }}
          >
            <button
              className="btn btn2"

              onClick={() =>
                clearAnswer(
                  q.id
                )
              }
            >
              Clear Response
            </button>

            <button
              className="btn btn2"

              onClick={() =>
                toggleReview(
                  q.id
                )
              }
            >
              {review[q.id]
                ? "Remove Review"
                : "Mark for Review"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",

              gap: "10px",
              marginTop: "25px",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn2"

              disabled={
                current ===
                section.start
              }

              onClick={
                previousQuestion
              }
            >
              Previous
            </button>

            {current <
            section.end ? (
              <button
                className="btn"

                onClick={
                  nextQuestion
                }
              >
                Save & Next
              </button>
            ) : (
              <button
                className="btn btn2"
                disabled
              >
                Last Question
              </button>
            )}
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
        </div>

        <div className="card">

          <div className="top">
            <div>
              <b>
                {section.short} Question Palette
              </b>

              <div className="muted">
                Section{" "}
                {activeSection + 1}{" "}
                of 3
              </div>
            </div>

            <b>
              {sectionAnswered}
              /
              {
                sectionQuestions.length
              }
            </b>
          </div>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fill, minmax(46px, 1fr))",

              gap: "8px",
              marginTop: "18px",
            }}
          >
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
                    key={
                      questionId
                    }

                    onClick={() =>
                      goQuestion(
                        absoluteIndex
                      )
                    }

                    style={{
                      padding:
                        "11px 4px",

                      borderRadius:
                        "7px",

                      border:
                        current ===
                        absoluteIndex
                          ? "3px solid #172033"
                          : "1px solid #ccd5e3",

                      fontWeight:
                        "700",

                      cursor:
                        "pointer",

                      background:
                        status.background,

                      color:
                        status.color,
                    }}
                  >
                    {localIndex +
                      1}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              marginTop: "20px",
              lineHeight: "2",
            }}
          >
            <div>
              🟢 Answered / उत्तर दिया
            </div>

            <div>
              🔴 Not Answered / उत्तर नहीं दिया
            </div>

            <div>
              🟣 Marked for Review / समीक्षा
            </div>

            <div>
              ⚪ Not Visited / नहीं देखा
            </div>
          </div>
        </div>

        <div className="card">

          {activeSection < 2 ? (
            <>
              <h3>
                Submit Current Section
              </h3>

              <p className="muted">
                इस अनुभाग को submit करने के बाद यह server पर lock हो जाएगा और आप इसमें वापस नहीं आ सकेंगे।
              </p>

              <button
                className="btn"

                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "16px",
                }}

                disabled={
                  changingSection
                }

                onClick={
                  manualSubmitSection
                }
              >
                {changingSection
                  ? "Opening Next Section..."
                  : `Submit ${section.short} Section / अनुभाग जमा करें`}
              </button>
            </>
          ) : (
            <>
              <h3>
                Final Test Submission
              </h3>

              <p className="muted">
                सभी उत्तर जाँचने के बाद पूरा टेस्ट submit करें।
              </p>

              <button
                className="btn"

                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "16px",
                }}

                disabled={
                  submitting
                }

                onClick={() =>
                  submitTest(false)
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Final Test / परीक्षा जमा करें"}
              </button>
            </>
          )}

        </div>

      </main>
    </>
  );
}
