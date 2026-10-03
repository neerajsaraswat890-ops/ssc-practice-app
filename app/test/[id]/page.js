"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Test() {
  const { id } = useParams();
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTest() {
      const { data, error } = await supabase()
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
        .order("question_order");

      if (error) {
        setError(error.message);
      } else {
        setQuestions(data || []);
      }

      setLoading(false);
    }

    loadTest();
  }, [id]);

  function selectAnswer(questionId, option) {
    setAnswers((old) => ({
      ...old,
      [questionId]: option,
    }));
  }

  async function submitTest() {
    if (submitting) return;

    setSubmitting(true);
    setError("");

    const { data, error } = await supabase().rpc("submit_test", {
      p_test_id: Number(id),
      p_answers: answers,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    sessionStorage.setItem(
      `test_result_${id}`,
      JSON.stringify(data)
    );

    router.push(`/result/${id}`);
  }

  if (loading) {
    return (
      <main className="wrap">
        <div className="nav">SSC Practice</div>
        <div className="card">Loading test...</div>
      </main>
    );
  }

  if (error && !questions.length) {
    return (
      <main className="wrap">
        <div className="nav">SSC Practice</div>
        <div className="card">
          <b>Error:</b> {error}
        </div>
      </main>
    );
  }

  if (!questions.length) {
    return (
      <main className="wrap">
        <div className="nav">SSC Practice</div>
        <div className="card">
          No questions have been assigned to this test.
        </div>
      </main>
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

  return (
    <>
      <div className="nav">SSC Practice • Test</div>

      <main className="wrap">
        <div className="card">

          <div className="top">
            <b>
              Question {current + 1} / {questions.length}
            </b>

            <span className="muted">Test #{id}</span>
          </div>

          <h3>{q.question_text}</h3>

          <div className="options">
            {Object.entries(options).map(([key, value]) => (
              <label key={key}>
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  checked={answers[q.id] === key}
                  onChange={() => selectAnswer(q.id, key)}
                />{" "}
                <b>{key}.</b> {value}
              </label>
            ))}
          </div>

          {error && (
            <p style={{ color: "red" }}>
              {error}
            </p>
          )}

          <div className="top">
            <button
              className="btn btn2"
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}
            >
              Previous
            </button>

            {current < questions.length - 1 ? (
              <button
                className="btn"
                onClick={() => setCurrent(current + 1)}
              >
                Save & Next
              </button>
            ) : (
              <button
                className="btn"
                disabled={submitting}
                onClick={submitTest}
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </button>
            )}
          </div>

          <p className="muted">
            Answered: {Object.keys(answers).length} / {questions.length}
          </p>

        </div>
      </main>
    </>
  );
}
