
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";

const EXAM_NAMES = {
  SSC_CGL: "SSC CGL",
  SSC_CHSL: "SSC CHSL",
  SSC_CPO: "SSC CPO",
  SSC_GD: "SSC GD",
  SSC_STENO: "SSC Stenographer",
  UPP_CONSTABLE: "UP Police Constable",
  UPP_SI_CIVIL: "UP Police SI",
  UPP_MINISTERIAL: "UP Police Ministerial / ASI",
};

const CATEGORIES = [
  {
    icon: "📝",
    title: "Full Mock Tests",
    description: "Complete exam pattern based tests",
  },
  {
    icon: "📚",
    title: "Subject-wise Practice",
    description: "Practice each subject separately",
  },
  {
    icon: "📖",
    title: "Chapter-wise Practice",
    description: "Topic and chapter based questions",
  },
  {
    icon: "📋",
    title: "Previous Year Papers",
    description: "Exam-wise previous year questions",
  },
];

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();

  const code = String(params?.code || "");

  const [examName, setExamName] = useState(
    EXAM_NAMES[code] || code.replaceAll("_", " ")
  );

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [validExam, setValidExam] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [fullTests, setFullTests] = useState([]);
  const [showFullTests, setShowFullTests] = useState(false);
  const supportsFullTests = ["SSC_CGL", "SSC_CHSL", "SSC_STENO"].includes(code);

  useEffect(() => {
    let active = true;
    const client = supabase();

    async function checkAccessAndExam() {
      setChecking(true);
      setAuthorized(false);
      setValidExam(false);
      setErrorMessage("");
      setFullTests([]);
      setShowFullTests(false);

      try {
        // Step 1: Verify the logged-in user.
        const { data: authData, error: authError } =
          await client.auth.getUser();

        if (!active) return;

        if (
          authError ||
          !authData?.user ||
          authData.user.is_anonymous
        ) {
          router.replace("/login");
          return;
        }

        setAuthorized(true);

        // Step 2: Load the selected examination.
        const { data, error } = await client
          .from("exams")
          .select("*")
          .eq("exam_code", code)
          .eq("is_active", true)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setErrorMessage(
            "Unable to load examination. Please try again."
          );
        } else if (data) {
          setValidExam(true);

          setExamName(
            EXAM_NAMES[code] ||
              data.exam_name ||
              data.name ||
              code.replaceAll("_", " ")
          );
          if (["SSC_CGL", "SSC_CHSL", "SSC_STENO"].includes(code)) {
            const { data: stages, error: stageError } = await client
              .from("exam_stages").select("id").eq("exam_id", data.id).eq("is_active", true);
            if (stageError) throw stageError;
            if (stages?.length) {
              const { data: tests, error: testsError } = await client
                .from("tests")
                .select("id,title,total_questions,total_marks,duration_minutes,negative_mark,attempt_until")
                .in("exam_stage_id", stages.map((stage) => stage.id))
                .eq("test_type", "mock").eq("status", "published")
                .order("title", { ascending: true });
              if (testsError) throw testsError;
              if (!active) return;
              // Server-owned state follows the student across browsers.
              const testIds = (tests || []).map((test) => test.id);
              let attemptMap = new Map();
              if (testIds.length > 0) {
                const { data: attempts, error: attemptsError } = await client
                  .from("attempts")
                  .select("test_id,status")
                  .eq("user_id", authData.user.id)
                  .in("test_id", testIds);
                if (attemptsError) throw attemptsError;
                attemptMap = new Map((attempts || []).map((a) => [Number(a.test_id), a.status]));
              }
              if (!active) return;
              setFullTests((tests || [])
                .map((test) => ({
                  ...test,
                  attemptStatus: attemptMap.get(Number(test.id)) || "not_started",
                }))
                .filter((test) => test.attemptStatus === "submitted" ||
                  !test.attempt_until || new Date(test.attempt_until).getTime() > Date.now()));
            }
          }
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            "Unable to verify your account or load examination."
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    checkAccessAndExam();

    return () => {
      active = false;
    };
  }, [code, router]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setErrorMessage("");

    try {
      const { error } = await supabase().auth.signOut();

      if (error) {
        setErrorMessage(error.message);
        setLoggingOut(false);
        return;
      }

      setAuthorized(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  // Do not display examination content without login.
  if (!authorized) {
    return (
      <main
        className="wrap"
        style={{
          padding: "48px 20px",
          textAlign: "center",
        }}
      >
        <p>Checking login...</p>
      </main>
    );
  }

  return (
    <>
      <header
        className="nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Image
            src="/jd-exambook-logo.png"
            alt="JD Exambook"
            width={44}
            height={44}
          />

          <strong>JD Exambook</strong>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn btn2"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      <main className="wrap">
        <p>
          <Link href="/dashboard">
            ← Back to Examinations
          </Link>
        </p>

        {errorMessage && (
          <p role="alert" style={{ color: "#dc2626" }}>
            {errorMessage}
          </p>
        )}

        {checking ? (
          <div className="card">
            Loading exam...
          </div>
        ) : !validExam ? (
          <div className="card">
            <h2>Exam Not Available</h2>

            <p>
              This examination is not currently available.
            </p>
          </div>
        ) : (
          <>
            <div
              className="card"
              style={{
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h1>{examName}</h1>

              <p className="muted">
                Practice Tests, Mock Tests and PYQs
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "16px",
              }}
            >
              {CATEGORIES.map((category) => (
                <div
                  className="card"
                  key={category.title}
                  style={{
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>
                    {category.icon}
                  </div>

                  <h3>{category.title}</h3>

                  <p className="muted">
                    {category.description}
                  </p>

                  <a className="btn"
                    href={`/exams/${encodeURIComponent(code)}/${category.title === "Full Mock Tests" ? "full-tests" : category.title === "Subject-wise Practice" ? "subject-wise" : category.title === "Chapter-wise Practice" ? "chapter-wise" : "previous-year"}`}
                    target="_blank" rel="noopener noreferrer">
                    {category.title === "Full Mock Tests" ? "View Full Tests" : "View Tests"}
                  </a>
                </div>
              ))}
            </div>


          </>
        )}
      </main>
    </>
  );
}

