"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "long", timeZone: "Asia/Kolkata",
  }).format(date);
};
const plainText = (value) => String(value || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&ndash;/gi, "–")
  .replace(/&mdash;/gi, "—")
  .replace(/&#8377;|&rupee;/gi, "₹")
  .replace(/\s+/g, " ").trim();
const factsFrom = (value) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return list.map(plainText).filter((fact) =>
    fact.length >= 35 && fact.length <= 500 &&
    !/(see all newsletters|newsletter|skip to main content|read later|e-paper|search for topics|food section|sports section|follow live updates|remove president|subscribe|sign in)/i.test(fact)
  ).slice(0, 8);
};
const sourceHref = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};
const styles = [
  ".jd-ca-detail{min-height:100vh;background:#f5f8fc;color:#172b4d;font-family:Arial,sans-serif}",
  ".jd-ca-detail-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:17px max(5%,calc((100vw - 1000px)/2));display:flex;justify-content:space-between;align-items:center;gap:16px}",
  ".jd-ca-detail-header a{text-decoration:none}.jd-ca-detail-logo{font-weight:800;color:#0764b8;font-size:21px}.jd-ca-back{color:#475569}",
  ".jd-ca-detail-main{max-width:900px;margin:34px auto 80px;padding:0 18px}",
  ".jd-ca-detail-card{background:#fff;border:1px solid #e0e7ef;border-radius:16px;padding:clamp(20px,4vw,36px);box-shadow:0 5px 18px rgba(26,60,90,.04)}",
  ".jd-ca-detail-meta{color:#06724f;font-size:14px;font-weight:700;line-height:1.7;margin-bottom:12px}",
  ".jd-ca-detail h1{font-size:clamp(25px,4vw,38px);line-height:1.35;margin:0 0 22px}",
  ".jd-ca-detail h2{font-size:21px;margin:28px 0 12px}",
  ".jd-ca-detail-summary,.jd-ca-detail-facts{font-size:17px;line-height:1.85;color:#334155}",
  ".jd-ca-detail-facts{padding-left:23px}.jd-ca-detail-facts li{padding:0 0 12px}",
  ".jd-ca-detail-tags{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}.jd-ca-detail-tags span{background:#eff6ff;color:#0759a6;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:700}",
  ".jd-ca-detail-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}",
  ".jd-ca-detail-actions a{display:inline-flex;align-items:center;justify-content:center;border:1px solid #0a65b9;border-radius:10px;padding:12px 16px;text-decoration:none;font-weight:700;color:#0a65b9;background:#fff}",
  ".jd-ca-detail-actions a.primary{background:#0966ba;color:#fff}",
  ".jd-ca-detail-note{font-size:13px;color:#64748b;margin-top:18px;line-height:1.6}",
  ".jd-ca-detail-message{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:24px;text-align:center;line-height:1.7}",
  "@media(max-width:640px){.jd-ca-detail-header{padding:15px 5%}.jd-ca-detail-main{margin-top:22px}.jd-ca-detail-summary,.jd-ca-detail-facts{font-size:16px}}",
].join("");

export default function CurrentAffairsArticlePage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("hi");

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const loadArticle = async () => {
      try {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) throw new Error("समाचार नहीं मिला।");
        const { data, error: queryError } = await supabase()
          .from("ca_items")
          .select("id,headline_en,headline_hi,summary_en,summary_hi,canonical_url,source_name,published_at,event_date,exam_category,exam_tags,topics,key_facts_en,key_facts_hi,static_gk_en,static_gk_hi,status,visible_at,evidence_checked")
          .eq("id", numericId)
          .in("status", ["approved", "published"])
          .eq("evidence_checked", true)
          .not("visible_at", "is", null)
          .lte("visible_at", new Date().toISOString())
          .maybeSingle()
          .abortSignal(controller.signal);
        if (queryError) throw queryError;
        if (live) setArticle(data || null);
      } catch (e) {
        if (live && e?.name !== "AbortError") setError(e?.message || "समाचार अभी लोड नहीं हो पाया।");
      } finally {
        if (live) setLoading(false);
      }
    };
    loadArticle();
    return () => { live = false; controller.abort(); };
  }, [id]);

  const title = article
    ? ((language === "hi" ? article.headline_hi : article.headline_en) || article.headline_en)
    : "";
  const summary = article
    ? plainText((language === "hi" ? article.summary_hi : article.summary_en) || article.summary_en)
    : "";
  const facts = useMemo(() => article
    ? factsFrom((language === "hi" ? article.key_facts_hi : article.key_facts_en) || article.key_facts_en)
    : [], [article, language]);
  const staticGk = article
    ? plainText((language === "hi" ? article.static_gk_hi : article.static_gk_en) || article.static_gk_en)
    : "";
  const official = sourceHref(article?.canonical_url);
  const tags = [...new Set([article?.exam_category, ...(article?.exam_tags || [])].filter(Boolean))];

  return (
    <main className="jd-ca-detail">
      <header className="jd-ca-detail-header">
        <Link href="/" className="jd-ca-detail-logo">JD Exambook</Link>
        <Link href="/current-affairs" className="jd-ca-back">← सभी Current Affairs</Link>
      </header>
      <section className="jd-ca-detail-main">
        {loading ? <p className="jd-ca-detail-message">समाचार लोड हो रहा है…</p> :
          error ? <p role="alert" className="jd-ca-detail-message">{error}</p> :
          !article ? <p className="jd-ca-detail-message">यह समाचार अभी प्रकाशित नहीं है या उपलब्ध नहीं है। <Link href="/current-affairs">वापस Current Affairs पर जाएँ</Link></p> :
          <article className="jd-ca-detail-card">
            <div className="jd-ca-detail-meta">{article.exam_category || "Current Affairs"} · {article.source_name || "Verified source"} · {formatDate(article.published_at || article.event_date)}</div>
            <h1>{title}</h1>
            <button type="button" onClick={() => setLanguage(language === "hi" ? "en" : "hi")}>{language === "hi" ? "English" : "हिन्दी"}</button>
            {summary && <><h2>{language === "hi" && !article.summary_hi ? "सार (सत्यापित अंग्रेज़ी स्रोत से)" : language === "hi" ? "महत्वपूर्ण सार" : "Key summary"}</h2><p className="jd-ca-detail-summary">{summary}</p></>}
            {facts.length > 0 && <><h2>{language === "hi" ? "महत्वपूर्ण तथ्य" : "Important facts"}</h2><ul className="jd-ca-detail-facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul></>}
            {staticGk && <><h2>{language === "hi" ? "परीक्षा से जुड़ा स्थिर तथ्य" : "Static GK connection"}</h2><p className="jd-ca-detail-summary">{staticGk}</p></>}
            <div className="jd-ca-detail-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            <div className="jd-ca-detail-actions">
              <Link className="primary" href="/current-affairs">और Current Affairs पढ़ें</Link>
              {official && <a href={official} target="_blank" rel="noopener noreferrer">मूल स्रोत पर जाएँ ↗</a>}
            </div>
            <p className="jd-ca-detail-note">तथ्य और सार उपलब्ध सत्यापित समाचार रिकॉर्ड से लिए गए हैं। मूल स्रोत के लिए अलग लिंक दिया गया है।</p>
          </article>
        }
      </section>
      <style>{styles}</style>
    </main>
  );
}
