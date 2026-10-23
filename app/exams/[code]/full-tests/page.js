"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

export default function FullTestsPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params?.code || "");
  const [examName, setExamName] = useState(code.replaceAll("_", " "));
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const client = supabase();
        const { data: auth, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError || !auth?.user || auth.user.is_anonymous) {
          router.replace("/login");
          return;
        }
        const { data: exam, error: examError } = await client.from("exams")
          .select("id,exam_name,exam_code").eq("exam_code", code).eq("is_active", true).maybeSingle();
        if (examError || !exam) throw new Error("Examination not available.");
        if (!active) return;
        setExamName(exam.exam_name || code.replaceAll("_", " "));
        const { data: stages, error: stageError } = await client.from("exam_stages")
          .select("id").eq("exam_id", exam.id).eq("is_active", true);
        if (stageError) throw stageError;
        const ids = (stages || []).map(stage => stage.id);
        if (!ids.length) { setTests([]); return; }
        const { data: found, error: testError } = await client.from("tests")
          .select("id,title,total_questions,total_marks,duration_minutes,negative_mark,attempt_until")
          .in("exam_stage_id", ids).eq("test_type", "mock").eq("status", "published")
          .order("title", { ascending: true });
        if (testError) throw testError;
        const numbered = (found || []).map(test => {
          const match = test.title.match(/(?:full\s*(?:mock\s*)?test\s*[-:#]?\s*)(\d+)/i);
          return { ...test, number: match ? Number(match[1]) : null };
        }).filter(test => test.number !== null && test.number >= 1 && test.number <= 10)
          .sort((a,b) => a.number-b.number || a.id-b.id);
        const testIds = numbered.map(test => test.id);
        let attemptMap = new Map();
        if (testIds.length) {
          const { data: attempts, error: attemptError } = await client.from("attempts")
            .select("test_id,status").eq("user_id", auth.user.id).in("test_id", testIds);
          if (attemptError) throw attemptError;
          attemptMap = new Map((attempts || []).map(a => [Number(a.test_id), a.status]));
        }
        if (active) setTests(numbered.map(test => ({
          ...test, attemptStatus: attemptMap.get(Number(test.id)) || "not_started"
        })).filter(test => test.attemptStatus === "submitted" ||
          !test.attempt_until || new Date(test.attempt_until).getTime() > Date.now()));
      } catch (e) {
        if (active) setError(e.message || "Unable to load full tests.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [code, router]);

  return (
    <main className="wrap" style={{padding:"32px 16px 56px",maxWidth:1080,margin:"0 auto"}}>
      <Link href={`/exams/${encodeURIComponent(code)}`} style={{textDecoration:"none"}}>← Back to Examination</Link>
      <h1 style={{marginTop:24}}>{examName} — Full Tests 1–10</h1>
      <p className="muted">Choose a full test to begin, resume or view your result.</p>
      {loading ? <p>Loading Full Tests...</p> : error ? <p role="alert">{error}</p> :
        tests.length === 0 ? <p>No published Full Tests 1–10 are currently available.</p> :
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))",gap:16,marginTop:24}}>
          {tests.map(test => <article className="card" key={test.id} style={{padding:22}}>
            <h2 style={{fontSize:20}}>{test.title}</h2>
            <p>{test.total_questions} Questions · {test.total_marks} Marks · {test.duration_minutes} Minutes</p>
            <p className="muted">Negative marking: {test.negative_mark} per wrong answer</p>
            {test.attemptStatus === "submitted" ?
              <Link className="btn" href={`/result/${test.id}`}>View Result / परिणाम देखें</Link> :
              test.attemptStatus === "in_progress" ?
              <Link className="btn" href={`/test/${test.id}`}>Resume Test / टेस्ट जारी रखें</Link> :
              <Link className="btn" href={`/instructions/${test.id}`}>Start Test / टेस्ट शुरू करें</Link>}
          </article>)}
        </div>}
    </main>
  );
}
