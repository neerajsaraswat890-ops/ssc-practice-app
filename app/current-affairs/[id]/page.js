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

const hindiFactsFrom = (value) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(list.map(plainText).filter((fact) =>
    fact.length >= 12 && fact.length <= 500 &&
    /[\u0900-\u097F]/.test(fact) &&
    !/(newsletter|skip to main content|read later|e-paper|search for topics|food section|sports section|follow live updates|subscribe|sign in)/i.test(fact)
  ))].slice(0, 8);
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

const styles = [
  ".jd-ca-detail{min-height:100vh;background:#f5f8fc;color:#172b4d;font-family:Arial,sans-serif}",
  ".jd-ca-detail-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:17px max(5%,calc((100vw - 1000px)/2));display:flex;justify-content:space-between;align-items:center;gap:16px}",
  ".jd-ca-detail-header a{text-decoration:none}.jd-ca-detail-logo{font-weight:800;color:#0764b8;font-size:21px}.jd-ca-back{color:#475569}",
  ".jd-ca-detail-main{max-width:900px;margin:34px auto 80px;padding:0 18px}",
  ".jd-ca-detail-card{background:#fff;border:1px solid #e0e7ef;border-radius:16px;padding:clamp(20px,4vw,36px);box-shadow:0 5px 18px rgba(26,60,90,.04)}",
  ".jd-ca-detail-meta{color:#06724f;font-size:14px;font-weight:700;line-height:1.7;margin-bottom:12px}",
  ".jd-ca-detail h1{font-size:clamp(25px,4vw,38px);line-height:1.35;margin:0 0 22px}",
  ".jd-ca-detail h2{font-size:21px;margin:28px 0 12px}",
  ".jd-ca-detail-facts{font-size:17px;line-height:1.85;color:#334155;padding-left:23px}.jd-ca-detail-facts li{padding:0 0 12px}",
  ".jd-ca-detail-message{background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:24px;text-align:center;line-height:1.7}",
  ".jd-ca-detail-message a{color:#0866b2}",
  "@media(max-width:640px){.jd-ca-detail-header{padding:15px 5%}.jd-ca-detail-main{margin-top:22px}.jd-ca-detail-facts{font-size:16px}}",
].join("");

export default function CurrentAffairsArticlePage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const loadArticle = async () => {
      try {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) throw new Error("समाचार नहीं मिला।");
        const { data, error: queryError } = await supabase()
          .from("ca_items")
          .select("id,headline_hi,published_at,event_date,exam_category,key_facts_hi,static_gk_hi,status,visible_at,evidence_checked")
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

  const title = plainText(article?.headline_hi);
  const facts = useMemo(() => article
    ? [...hindiFactsFrom(article.key_facts_hi), ...hindiFactsFrom(article.static_gk_hi)].slice(0, 8)
    : [], [article]);
  const category = categoryHi(article?.exam_category);
  const date = formatDate(article?.published_at || article?.event_date);

  return (
    <main className="jd-ca-detail">
      <header className="jd-ca-detail-header">
        <Link href="/" className="jd-ca-detail-logo">JD Exambook</Link>
        <Link href="/current-affairs" className="jd-ca-back">← सभी समसामयिकी</Link>
      </header>
      <section className="jd-ca-detail-main">
        {loading ? <p className="jd-ca-detail-message">समाचार लोड हो रहा है…</p> :
          error ? <p role="alert" className="jd-ca-detail-message">{error}</p> :
          !article ? <p className="jd-ca-detail-message">यह समाचार अभी प्रकाशित नहीं है या उपलब्ध नहीं है। <Link href="/current-affairs">समसामयिकी पर वापस जाएँ</Link></p> :
          <article className="jd-ca-detail-card">
            {(category || date) && <div className="jd-ca-detail-meta">{[category, date].filter(Boolean).join(" · ")}</div>}
            <h1>{title || "शीर्षक हिन्दी में उपलब्ध नहीं है"}</h1>
            <h2>परीक्षा-उपयोगी महत्वपूर्ण तथ्य</h2>
            {facts.length > 0
              ? <ul className="jd-ca-detail-facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>
              : <p className="jd-ca-detail-message">इस समाचार के सत्यापित हिन्दी परीक्षा-उपयोगी तथ्य अभी उपलब्ध नहीं हैं।</p>}
          </article>
        }
      </section>
      <style>{styles}</style>
    </main>
  );
}
