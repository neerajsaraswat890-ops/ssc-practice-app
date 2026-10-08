"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [tests, setTests] = useState([]);
  const [submittedTestIds, setSubmittedTestIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const client = supabase();

    const { data: testsData } = await client
      .from("tests")
      .select("*")
      .eq("status", "published")
      .order("publish_at", { ascending: false });

    const { data: attemptsData } = await client
      .from("attempts")
      .select("test_id,status")
      .eq("status", "submitted");

    setTests(testsData || []);

    setSubmittedTestIds(
      (attemptsData || []).map((a) => a.test_id)
    );

    setLoading(false);
  }

  function isSubmitted(testId) {
    return submittedTestIds.includes(testId);
  }

  if (loading) {
    return (
      <>
        <div className="nav">
          JD Exambook • Student Dashboard
        </div>

        <main className="wrap">
          <div className="card">
            Loading dashboard...
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div className="nav">
        JD Exambook • Student Dashboard
      </div>

      <main className="wrap">

        <div className="card hero">
          <h2>Today's Test</h2>

          {tests[0] ? (
            <>
              <h3>{tests[0].title}</h3>

              <p>
                {tests[0].total_questions} Questions •{" "}
                {tests[0].duration_minutes} Minutes
              </p>

              {isSubmitted(tests[0].id) ? (
                <Link href={"/result/" + tests[0].id}>
                  <button className="btn">
                    View Result
                  </button>
                </Link>
              ) : (
                <Link href={"/instructions/" + tests[0].id}>
                  <button className="btn">
                    Start Test
                  </button>
                </Link>
              )}
            </>
          ) : (
            <p>No published test yet.</p>
          )}
        </div>

        <h2>Previous Tests</h2>

        {tests.map((t) => (
          <div className="card top" key={t.id}>
            <div>
              <b>{t.title}</b>

              <div className="muted">
                {t.total_questions} questions
              </div>

              {isSubmitted(t.id) && (
                <div
                  style={{
                    marginTop: "6px",
                    fontWeight: "700",
                    color: "#15803d",
                  }}
                >
                  ✓ Submitted
                </div>
              )}
            </div>

            {isSubmitted(t.id) ? (
              <Link href={"/result/" + t.id}>
                <button className="btn">
                  View Result
                </button>
              </Link>
            ) : (
              <Link href={"/instructions/" + t.id}>
                <button className="btn btn2">
                  Open
                </button>
              </Link>
            )}
          </div>
        ))}

      </main>
    </>
  );
}
