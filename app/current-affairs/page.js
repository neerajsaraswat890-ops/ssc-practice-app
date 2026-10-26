"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const fmt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "medium", timeZone: "Asia/Kolkata",
  }).format(date);
};
const hindiFactsFrom = (value) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(list.map((fact) => String(fact || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\s+/g, " ").trim())
    .filter((fact) => fact.length >= 12 && /[\u0900-\u097F]/.test(fact)))].slice(0, 3);
};
const categoryHi = (value) => ({
  "Appointments & Awards": "नियुक्तियाँ एवं पुरस्कार",
  "Economy & Banking": "अर्थव्यवस्था एवं बैंकिंग",
  "Government Schemes": "सरकारी योजनाएँ",
  "International Relations": "अंतरराष्ट्रीय संबंध",
  "Reports & Rankings": "रिपोर्ट एवं सूचकांक",
  "Science & Technology": "विज्ञान एवं प्रौद्योगिकी",
  "Sports": "खेल",
  "Environment": "पर्यावरण",
  "Polity": "राजव्यवस्था",
  "Defence": "रक्षा",
  "National": "राष्ट्रीय",
  "International": "अंतरराष्ट्रीय",
})[value] || "";
const published = (db, table, columns, limit) => db.from(table)
  .select(columns)
  .in("status", ["approved", "published"])
  .not("visible_at", "is", null)
  .lte("visible_at", new Date().toISOString())
  .order("visible_at", { ascending: false })
  .limit(limit);

export default function CurrentAffairsPage() {
  const [news, setNews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(true);
  const [newsError, setNewsError] = useState("");
  const [quizError, setQuizError] = useState("");
  const [language, setLanguage] = useState("hi");
  const [mode, setMode] = useState("news");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const load = async (request, update, updateError, updateLoading) => {
      try {
        const { data, error } = await request;
        if (error) throw error;
        if (live) update(data || []);
      } catch (e) {
        if (live) updateError(e?.message || "डेटा अभी उपलब्ध नहीं हो पाया।");
      } finally {
        if (live) updateLoading(false);
      }
    };
    try {
      const db = supabase();
      Promise.all([
        load(published(db, "ca_items",
            "id,headline_hi,key_facts_hi,static_gk_hi,published_at,event_date,exam_category,evidence_checked", 40)
            .eq("evidence_checked", true)
            .abortSignal(controller.signal), setNews, setNewsError, setNewsLoading),
        load(published(db, "ca_questions",
            "id,question_en,question_hi,option_a_en,option_b_en,option_c_en,option_d_en,option_a_hi,option_b_hi,option_c_hi,option_d_hi,correct_answer,qa_passed", 25)
            .eq("qa_passed", true)
            .not("question_hi", "is", null).not("option_a_hi", "is", null)
            .abortSignal(controller.signal), setQuestions, setQuizError, setQuizLoading),
      ]).finally(() => clearTimeout(timer));
    } catch (e) {
      clearTimeout(timer);
      if (live) {
        setNewsError(e?.message || "समाचार अभी उपलब्ध नहीं हो पाए।");
        setQuizError(e?.message || "प्रश्न अभी उपलब्ध नहीं हो पाए।");
        setNewsLoading(false);
        setQuizLoading(false);
      }
    }
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, []);

  const displayNews = news.filter((item) =>
    /[\\u0900-\\u097F]/.test(String(item.headline_hi || "")) &&
    [...hindiFactsFrom(item.key_facts_hi), ...hindiFactsFrom(item.static_gk_hi)].length > 0
  );

  const score = useMemo(() => questions.reduce((n, q) => {
    const correct = String(q.correct_answer || "").trim().toUpperCase();
    return n + (answers[q.id] === correct ? 1 : 0);
  }, 0), [questions, answers]);

  return (
    <main className="ca-page">
      <header className="ca-header">
        <Link href="/" className="ca-logo">JD Exambook</Link>
        <Link href="/" className="ca-home">← मुख्य पृष्ठ</Link>
      </header>
      <section className="ca-hero">
        <p className="ca-label">SSC • रेलवे • बैंकिंग • राज्य परीक्षाएँ</p>
        <h1>दैनिक समसामयिकी</h1>
        <p>परीक्षा की दृष्टि से उपयोगी सत्यापित समाचार और अभ्यास प्रश्न।</p>
        <div className="ca-actions">
          <button className={mode === "news" ? "active" : ""} onClick={() => setMode("news")}>दैनिक समाचार</button>
          <button className={mode === "quiz" ? "active" : ""} onClick={() => setMode("quiz")}>दैनिक प्रश्नोत्तरी</button>
          {mode === "quiz" && <button onClick={() => setLanguage(language === "hi" ? "en" : "hi")} aria-label="भाषा बदलें">{language === "hi" ? "English" : "हिन्दी"}</button>}
        </div>
      </section>
      <section className="ca-list" aria-live="polite">
        {mode === "news" ? (
            newsLoading ? <p className="ca-message">समाचार लोड हो रहे हैं…</p> :
            newsError ? <p role="alert" className="ca-message">अभी समाचार उपलब्ध नहीं हो पाए। {newsError}</p> :
            displayNews.length ? displayNews.map((item) => {
              const facts = [...hindiFactsFrom(item.key_facts_hi), ...hindiFactsFrom(item.static_gk_hi)].slice(0, 3);
              const category = categoryHi(item.exam_category);
              return <article key={item.id} className="ca-card">
                {(category || item.published_at || item.event_date) && <div className="ca-meta">{[category, fmt(item.published_at || item.event_date)].filter(Boolean).join(" · ")}</div>}
                <h2><Link href={"/current-affairs/" + item.id}>{item.headline_hi || "शीर्षक हिन्दी में उपलब्ध नहीं है"}</Link></h2>
                {facts.length
                  ? <ul className="ca-facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
                  : <p className="ca-no-facts">इस समाचार के हिन्दी परीक्षा-उपयोगी तथ्य उपलब्ध नहीं हैं।</p>}
                <Link className="ca-read-more" href={"/current-affairs/" + item.id}>महत्वपूर्ण तथ्य पढ़ें</Link>
              </article>;
            }) : <p className="ca-message">अभी हिन्दी में सत्यापित परीक्षा-उपयोगी तथ्य उपलब्ध नहीं हैं।</p>
          ) : (
            quizLoading ? <p className="ca-message">प्रश्नोत्तरी लोड हो रही है…</p> :
            quizError ? <p role="alert" className="ca-message">अभी प्रश्नोत्तरी उपलब्ध नहीं है। {quizError}</p> :
            questions.length ? <>
              <div className="ca-quiz-top"><span>{questions.length} सत्यापित प्रश्न</span>{submitted && <strong>स्कोर: {score}/{questions.length}</strong>}</div>
              {questions.map((q, i) => {
                const picked = answers[q.id];
                const correct = String(q.correct_answer || "").trim().toUpperCase();
                return <article className="ca-card" key={q.id}>
                  <h2>{i + 1}. {(language === "hi" ? q.question_hi : q.question_en) || (language === "hi" ? "प्रश्न हिन्दी में उपलब्ध नहीं है" : "")}</h2>
                  <div className="ca-options">
                    {["A", "B", "C", "D"].map((opt) => {
                      const key = "option_" + opt.toLowerCase() + (language === "hi" ? "_hi" : "_en");
                      const option = q[key];
                      if (!option) return null;
                      return <button key={opt} disabled={submitted} aria-pressed={picked === opt}
                        className={[picked === opt ? "selected" : "", submitted && opt === correct ? "correct" : "", submitted && picked === opt && picked !== correct ? "incorrect" : ""].join(" ")}
                        onClick={() => setAnswers(v => ({ ...v, [q.id]: opt }))}>
                        {opt}. {option}
                      </button>;
                    })}
                  </div>
                  {submitted && <p className="ca-answer">उत्तर: {correct}</p>}
                </article>;
              })}
              <div className="ca-quiz-actions">
                {!submitted ? <button onClick={() => setSubmitted(true)}>जमा करें</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }}>पुनः प्रयास करें</button>}
              </div>
            </> : <p className="ca-message">अभी कोई सत्यापित और प्रकाशित प्रश्न उपलब्ध नहीं है।</p>
          )}
      </section>
      <footer className="ca-foot">© 2026 JD Exambook · केवल स्वीकृत सामग्री दिखाई जाती है</footer>
      <style>{`
        .ca-page{min-height:100vh;background:#f5f8fc;color:#172b4d;font-family:Arial,sans-serif}
        .ca-header{background:white;border-bottom:1px solid #e2e8f0;padding:17px max(5%,calc((100vw - 1100px)/2));display:flex;justify-content:space-between;align-items:center;gap:20px}
        .ca-header a{text-decoration:none}.ca-logo{font-weight:800;color:#0764b8;font-size:22px}.ca-home{color:#475569}
        .ca-hero{padding:55px 5% 38px;text-align:center;background:linear-gradient(130deg,#e7f4ff,#e8f9ef)}
        .ca-label{font-size:13px;font-weight:700;letter-spacing:.06em;color:#047857}
        .ca-hero h1{font-size:clamp(27px,4.5vw,42px);line-height:1.2;margin:14px auto;max-width:850px}
        .ca-hero p{max-width:750px;margin:12px auto;color:#475569;line-height:1.6}
        .ca-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:22px}
        .ca-actions button,.ca-quiz-actions button{border:1px solid #0a65b9;border-radius:10px;background:white;color:#0a65b9;padding:11px 18px;cursor:pointer;font-weight:700}
        .ca-actions button.active,.ca-quiz-actions button{background:#0966ba;color:white}
        .ca-list{max-width:950px;margin:28px auto 80px;padding:0 18px}
        .ca-card{background:white;border:1px solid #e0e7ef;border-radius:16px;padding:24px 26px;margin-bottom:17px;box-shadow:0 5px 18px rgba(26,60,90,.04)}
        .ca-meta{color:#06724f;font-size:13px;font-weight:700;margin-bottom:10px}
        .ca-card h2{font-size:clamp(18px,2.3vw,22px);line-height:1.5;margin:0 0 12px}.ca-card h2 a{color:inherit;text-decoration:none}.ca-card h2 a:hover{color:#0866b2}
        .ca-facts{line-height:1.75;color:#334155;padding-left:22px;margin:8px 0 14px}.ca-facts li{padding-bottom:6px}
        .ca-no-facts{line-height:1.7;color:#64748b;margin:0 0 14px}
        .ca-read-more{color:#0866b2;font-weight:700;text-decoration:none}
        .ca-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ca-options button{text-align:left;line-height:1.5;padding:13px 14px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;color:#172b4d;cursor:pointer}
        .ca-options button.selected{border:2px solid #2563eb;background:#eff6ff}
        .ca-options button.correct{border-color:#059669;background:#dcfce7}
        .ca-options button.incorrect{border-color:#dc2626;background:#fee2e2}
        .ca-quiz-top,.ca-quiz-actions{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .ca-message{border:1px solid #dbeafe;background:white;border-radius:12px;padding:25px;text-align:center;line-height:1.6}
        .ca-answer{font-weight:800;margin-top:10px!important;color:#166534!important}
        .ca-foot{text-align:center;padding:20px;color:#64748b;border-top:1px solid #e2e8f0}
        @media(max-width:640px){.ca-hero{padding:42px 5% 28px}.ca-options{grid-template-columns:1fr}.ca-card{padding:19px}.ca-header{padding:15px 5%}}
      `}</style>
    </main>
  );
}
