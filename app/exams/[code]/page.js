
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
  const [validExam, setValidExam] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkExam() {
      try {
        const { data, error } = await supabase()
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
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            "Unable to load examination. Please try again."
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    checkExam();

    return () => {
      active = false;
    };
  }, [code]);

  async function handleLogout() {
    const { error } = await supabase().auth.signOut();

    if (!error) {
      router.replace("/login");
      router.refresh();
    } else {
      setErrorMessage(error.message);
    }
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
          className="btn btn2"
        >
          Logout
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

                  <span
                    style={{
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    Coming Soon
                  </span>
                </div>
              ))}
            </div>

            <p
              className="muted"
              style={{ marginTop: "24px" }}
            >
              Question banks are being prepared.
              Tests will become available after
              content is uploaded and published.
            </p>
          </>
        )}
      </main>
    </>
  );
}
