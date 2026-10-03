"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Test() {
  const { id } = useParams();
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testInfo, setTestInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(null);

  const autoSubmitted = useRef(false);

  const answersKey = `test_answers_${id}`;
  const startKey = `test_start_${id}`;

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
              option_a,
              option_b,
              option_c,
              option_d
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

      setQuestions(questionData || []);
      setTestInfo(testData);

      const savedAnswers = localStorage.getItem(answersKey);

      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch {
          localStorage.removeItem(answersKey);
        }
      }

      const durationMinutes = Number(
        testData.duration_minutes || 120
      );

      let startedAt = localStorage.getItem(startKey);

      if (!startedAt) {
        startedAt = String(Date.now());
        localStorage.setItem(startKey, startedAt);
      }

      const endTime =
        Number(startedAt) +
        durationMinutes * 60 * 1000;

      const secondsRemaining = Math.max(
        0,
        Math.floor((endTime - Date.now()) / 1000)
      );

      setTimeLeft(secondsRemaining);
      setLoading(false);
    }

    loadTest();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || loading || submitting) {
      return;
    }

    if (timeLeft <= 0) {
      if (!autoSubmitted.current && questions.length) {
        autoSubmitted.current = true;
        submitTest(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((old) =>
        old === null ? old : Math.max(0, old - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, loading, submitting, questions.length]);

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

  async function submitTest(auto = false) {
    if (submitting) return;

    if (!auto) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the test?"
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
    localStorage.removeItem(startKey);

    router.push(`/result/${id}`);
  }

  function formatTime(totalSeconds) {
    if (totalSeconds === null) {
      return "--:--:--";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  }

  if (loading) {
    return (
      <>
        <div className="nav">
          SSC Practice • Test
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
          SSC Practice • Test
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
          SSC Practice • Test
        </div>

        <main className="wrap">
          <div className="card">
            No questions have been assigned to this test.
          </div>
        </main>
      </>
    );
  }

  const row = questions[current];
  const q = row.questions;

  const options = {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d,
  };

  const answeredCount =
    Object.keys(answers).length;

  return (
    <>
      <div className="nav">
        SSC Practice • Test
      </div>

      <main className="wrap">
        <div className="card">
          <div className="top">
            <div>
              <b>
                {testInfo?.title ||
                  `Test #${id}`}
              </b>

              <div className="muted">
                {questions.length} Questions
              </div>
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "800",
              }}
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="top">
            <b>
              Question {current + 1} /{" "}
              {questions.length}
            </b>

            <span className="muted">
              Answered: {answeredCount}
            </span>
          </div>

          <h3>{q.question_text}</h3>

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
                  <b>{key}.</b> {value}
                </label>
              )
            )}
          </div>

          <button
            className="btn btn2"
            onClick={() =>
              clearResponse(q.id)
            }
            style={{
              marginBottom: "16px",
            }}
          >
            Clear Response
          </button>

          {error && (
            <p style={{ color: "red" }}>
              {error}
            </p>
          )}

          <div className="top">
            <button
              className="btn btn2"
              disabled={current === 0}
              onClick={() =>
                setCurrent((old) => old - 1)
              }
            >
              Previous
            </button>

            {current <
            questions.length - 1 ? (
              <button
                className="btn"
                onClick={() =>
                  setCurrent((old) => old + 1)
                }
              >
                Save & Next
              </button>
            ) : (
              <button
                className="btn"
                disabled={submitting}
                onClick={() =>
                  submitTest(false)
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Test"}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <b>Question Palette</b>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(48px, 1fr))",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            {questions.map(
              (item, index) => {
                const questionId =
                  item.questions.id;

                const answered =
                  Boolean(
                    answers[questionId]
                  );

                return (
                  <button
                    key={questionId}
                    onClick={() =>
                      setCurrent(index)
                    }
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border:
                        current === index
                          ? "2px solid #1769e0"
                          : "1px solid #ccd5e3",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: answered
                        ? "#dff5e5"
                        : "#ffffff",
                    }}
                  >
                    {index + 1}
                  </button>
                );
              }
            )}
          </div>

          <p className="muted">
            Answered: {answeredCount} /{" "}
            {questions.length}
          </p>
        </div>

        <button
          className="btn"
          disabled={submitting}
          onClick={() =>
            submitTest(false)
          }
          style={{
            width: "100%",
            marginBottom: "30px",
          }}
        >
          {submitting
            ? "Submitting..."
            : "Submit Test"}
        </button>
      </main>
    </>
  );
}
