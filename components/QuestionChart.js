"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function QuestionChart({ assetId, language = "english" }) {
  const [image, setImage] = useState(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setFailed(false);
    setZoomed(false);
    if (!assetId) return;
    async function load() {
      try {
        const { data, error } = await supabase()
          .from("question_chart_assets")
          .select("id,mime_type,image_base64")
          .eq("id", assetId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data || data.mime_type !== "image/png") {
          setFailed(true);
          return;
        }
        setImage({ id: assetId, src: `data:image/png;base64,${data.image_base64}` });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [assetId, retry]);

  if (!assetId) return null;
  const hindi = language === "hindi";
  return (
    <figure style={{ margin: "16px 0", padding: 12, border: "1px solid #dbe3ee", borderRadius: 10, background: "#fff" }}>
      <figcaption style={{ marginBottom: 8, fontWeight: 700 }}>
        {hindi ? "प्रश्न का चार्ट" : "Question chart"}
      </figcaption>
      {failed ? (
        <div role="alert">
          <p>{hindi ? "चार्ट लोड नहीं हुआ। दोबारा प्रयास करें।" : "The chart could not be loaded. Please retry."}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)}>
            {hindi ? "दोबारा प्रयास करें" : "Retry chart"}
          </button>
        </div>
      ) : image?.id === assetId ? (
        <div>
          <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)} style={{ marginBottom: 8 }}>
            {zoomed ? (hindi ? "स्क्रीन के अनुसार छोटा करें" : "Fit to screen") : (hindi ? "चार्ट बड़ा करें" : "Enlarge chart")}
          </button>
          <div style={{ overflowX: "auto" }} tabIndex={zoomed ? 0 : undefined} aria-label={hindi ? "चार्ट" : "Chart"}>
          {/* Authenticated data URLs must not pass through the public image optimizer. */}
          <img src={image.src} alt={hindi ? `डेटा इंटरप्रिटेशन चार्ट ${assetId}` : `Data interpretation chart ${assetId}`} style={{ display: "block", maxWidth: zoomed ? "none" : "100%", height: "auto", margin: "0 auto" }} onError={() => setFailed(true)} />
          </div>
        </div>
      ) : <p role="status">{hindi ? "चार्ट लोड हो रहा है…" : "Loading chart…"}</p>}
    </figure>
  );
}
