"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

const CATEGORY = {
  "full-mock": { title: "Full Mock Tests", types: ["mock", "full_mock", "full", "full_test"] },
  "subject-wise": { title: "Subject-wise Practice", types: ["subject", "subject_wise", "subject-wise"] },
  "chapter-wise": { title: "Chapter-wise Practice", types: ["chapter", "chapter_wise", "chapter-wise"] },
  "previous-year": { title: "Previous Year Papers", types: ["pyq", "previous_year", "previous-year"] },
};

const EXAM_NAMES = {
  SSC_CGL: "SSC CGL", SSC_CHSL: "SSC CHSL", SSC_CPO: "SSC CPO",
  SSC_GD: "SSC GD", SSC_STENO: "SSC Stenographer",
  UPP_CONSTABLE: "UP Police Constable", UPP_SI_CIVIL: "UP Police SI",
  UPP_MINISTERIAL: "UP Police Ministerial / ASI",
};

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameExam(testExam, code, name) {
  const value = normalized(testExam);
  const variants = [normalized(code), normalized(name)];
  if (code === "SSC_STENO") variants.push("sscstenographergradecd", "sscstenographer");
  return value.length > 0 && variants.some((v) => v && (v === value || value.startsWith(v)));
}

export default function ExamCategoryPage() {
  const { code, category } = useParams();
  const router = useRouter();
  const examCode = String(code || "");
  const categoryKey = String(category || "");
  const config = CATEGORY[categoryKey];
  const [examName, setExamName] = useState(EXAM_NAMES[examCode] || examCode.replaceAll("_", " "));
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!config) { setError("Unknown test category."); setLoading(false); return; }
      const client = supabase();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !auth?.user || auth.user.is_anonymous) {
        router.replace("/login");
        return;
      }
      const { data: exam, error: examError } = await client
        .from("exams").select("exam_code,exam_name,is_active")
        .eq("exam_code", examCode).eq("is_active", true).maybeSingle();
      if (!active) return;
      if (examError || !exam) {
        setError(examError ? "Exam could not be loaded." : "Exam is not available.");
        setLoading(false);
        return;
      }
      const name = EXAM_NAMES[examCode] || exam.exam_name || examCode.replaceAll("_", " ");
      setExamName(name);
      const { data, error: testsError } = await client
        .from("tests")
        .select("id,title,test_type,exam,status,total_questions,duration_minutes")
        .eq("status", "published").order("id", { ascending: true });
      if (!active) return;
      if (testsError) setError("Tests could not be loaded. Please try again.");
      else setTests((data || []).filter((t) =>
        config.types.includes(String(t.test_type || "").toLowerCase()) &&
        sameExam(t.exam, examCode, name)
      ).slice(0, 10));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [examCode, categoryKey, router]);

  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <p><Link href={`/exams/${encodeURIComponent(examCode)}`}>← Back to {examName}</Link></p>
      <h1>{examName} — {config?.title || "Tests"}</h1>
      <p className="muted">10 test slots • Published tests become available as they are uploaded.</p>
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {loading ? <p>Loading tests...</p> : !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
          {Array.from({ length: 10 }, (_, index) => {
            const test = tests[index];
            return (
              <div className="card" key={index} style={{ padding: 20, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 24, marginBottom: 12 }} aria-hidden="true">{test ? "📝" : "🔒"}</div>
                <h3 style={{ marginBottom: 8 }}>{config.title.replace(/s$/, "")} {String(index + 1).padStart(2, "0")}</h3>
                {test ? (
                  <>
                    <p style={{ fontWeight: 600 }}>{test.title}</p>
                    <p className="muted">{test.total_questions || 0} Questions • {test.duration_minutes || 0} Minutes</p>
                    <Link className="btn" href={`/test/${test.id}`}>Start Test →</Link>
                  </>
                ) : (
                  <p className="muted">Coming Soon</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
