
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [tests, setTests] = useState([]);
  const [submittedTestIds, setSubmittedTestIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } = await supabase().auth.signOut();

      if (error) {
        setLogoutError(error.message);
        setLoggingOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error?.message || "Unable to logout. Please try again."
      );
      setLoggingOut(false);
    }
  }

  function isSubmitted(testId) {
    return submittedTestIds.includes(testId);
  }

  function DashboardHeader() {
    return (
      <div
        className="nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Image
            src="/jd-exambook-logo.png"
            alt="JD Exambook Logo"
            width={48}
            height={48}
            priority
            style={{
              objectFit: "contain",
              background: "white",
              borderRadius: "8px",
            }}
          />

          <div>
            <div
              style={{
                fontSize: "19px",
                fontWeight: "700",
                lineHeight: "1.3",
              }}
            >
              JD Exambook
            </div>

            <div
              style={{
                fontSize: "12px",
                opacity: 0.85,
              }}
            >
              Student Dashboard
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "13px",
            cursor: loggingOut ? "wait" : "pointer",
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "↪ Logout"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <DashboardHeader />

        <main className="wrap">
          {logoutError && (
            <div
              role="alert"
              style={{ color: "#dc2626", marginBottom: "12px" }}
            >
              {logoutError}
            </div>
          )}

          <div className="card">
            Loading dashboard...
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />

      <main className="wrap">
        {logoutError && (
          <div
            role="alert"
            style={{
              color: "#dc2626",
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            {logoutError}
          </div>
        )}

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
