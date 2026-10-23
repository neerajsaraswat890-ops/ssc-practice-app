"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const CONFIG = {
  "subject-wise": { title: "Subject-wise Practice", pattern: /subject|विषय/i },
  "chapter-wise": { title: "Chapter-wise Practice", pattern: /chapter|topic|अध्याय|टॉपिक/i },
  "previous-year": { title: "Previous Year Papers", pattern: /previous|pyq|पिछले|विगत/i },
};

export default function CategoryTestsPage() {
  const { code, category } = useParams();
  const router = useRouter();
  const config = CONFIG[String(category)];
  const [examName, setExamName] = useState(String(code).replaceAll("_", " "));
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!config) throw new Error("Unknown test category.");
        const client = supabase();
        const { data: auth, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError || !auth?.user || auth.user.is_anonymous) { router.replace("/login"); return; }
        const { data: exam, error: examError } = await client.from("exams")
          .select("id,exam_name").eq("exam_code", String(code)).eq("is_active", true).maybeSingle();
        if (examError || !exam) throw new Error("Examination not available.");
        if (active) setExamName(exam.exam_name || String(code).replaceAll("_", " "));
        const { data: stages, error: stageError } = await client.from("exam_stages")
          .select("id").eq("exam_id", exam.id).eq("is_active", true);
        if (stageError) throw stageError;
        if (!stages?.length) return;
        const { data: all, error: testError } = await client.from("tests")
          .select("id,title,test_type,total_questions,total_marks,duration_minutes,negative_mark,attempt_until")
          .in("exam_stage_id", stages.map(s => s.id)).eq("status", "published")
          .order("title", { ascending: true });
        if (testError) throw testError;
        const matching = (all || []).filter(t => config.pattern.test(t.title));
        let statuses = new Map();
        if (matching.length) {
          const { data: attempts, error: attemptError } = await client.from("attempts")
            .select("test_id,status").eq("user_id", auth.user.id).in("test_id", matching.map(t => t.id));
          if (attemptError) throw attemptError;
          statuses = new Map((attempts || []).map(a => [Number(a.test_id), a.status]));
        }
        if (active) setTests(matching.map(t => ({ ...t, attemptStatus: statuses.get(Number(t.id)) || "not_started" }))
          .filter(t => t.attemptStatus === "submitted" || !t.attempt_until || new Date(t.attempt_until).getTime() > Date.now()));
      } catch (e) { if (active) setError(e.message || "Unable to load tests."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [code, config, router]);

  return <main className="wrap" style={{padding:"32px 16px 56px",maxWidth:1080,margin:"0 auto"}}>
    <Link href={`/exams/${encodeURIComponent(String(code))}`}>← Back to Examination</Link>
    <h1 style={{marginTop:24}}>{examName} — {config?.title || "Tests"}</h1>
    {loading ? <p>Loading tests...</p> : error ? <p role="alert">{error}</p> :
      tests.length === 0 ? <p>No published tests are currently available in this category.</p> :
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16,marginTop:24}}>
        {tests.map(t => <article className="card" key={t.id} style={{padding:22}}>
          <h2 style={{fontSize:20}}>{t.title}</h2>
          <p>{t.total_questions} Questions · {t.total_marks} Marks · {t.duration_minutes} Minutes</p>
          <p className="muted">Negative marking: {t.negative_mark} per wrong answer</p>
          {t.attemptStatus === "submitted" ? <Link className="btn" href={`/result/${t.id}`}>View Result</Link> :
            t.attemptStatus === "in_progress" ? <Link className="btn" href={`/test/${t.id}`}>Resume Test</Link> :
              <Link className="btn" href={`/instructions/${t.id}`}>Start Test</Link>}
        </article>)}
      </div>}
  </main>;
}
