"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";

const cell = {border:"1px solid #d7deea",padding:11,textAlign:"left",fontSize:14};
const list = {lineHeight:1.8,paddingLeft:25};
const fmt = value => Number(value ?? 0).toLocaleString("en-IN");

export default function InstructionsPage() {
  const {id} = useParams();
  const router = useRouter();
  const [test,setTest] = useState(null);
  const [config,setConfig] = useState(null);
  const [loading,setLoading] = useState(true);
  const [signedIn,setSignedIn] = useState(false);
  const [starting,setStarting] = useState(false);
  const [agree,setAgree] = useState(false);
  const [language,setLanguage] = useState("english");
  const [error,setError] = useState("");
  const languageKey = "jd_language_" + id;
  const loginPath = "/login?next=" + encodeURIComponent("/instructions/" + id);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = localStorage.getItem(languageKey);
        if (saved === "english" || saved === "hindi") setLanguage(saved);
      } catch {}
      const client = supabase();
      const {data:testData,error:testError} = await client.from("tests")
        .select("id,title,total_questions,total_marks,duration_minutes,negative_mark,status")
        .eq("id",id).single();
      if (!active) return;
      if (testError || !testData) {
        setError(testError?.message || "Test not found / टेस्ट उपलब्ध नहीं है");
        setLoading(false);
        return;
      }
      setTest(testData);
      const {data:authData,error:authError} = await client.auth.getUser();
      if (!active) return;
      if (authError || !authData?.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      const {data:examConfig,error:configError} = await client.rpc("get_test_exam_config",{p_test_id:Number(id)});
      if (!active) return;
      if (configError || !examConfig?.stage) setError(configError?.message || "Exam configuration could not be loaded.");
      else setConfig(examConfig);
      setLoading(false);
    }
    load();
    return () => {active=false;};
  },[id]);

  function changeLanguage(value) {
    setLanguage(value);
    try {localStorage.setItem(languageKey,value);} catch {}
  }
  function prepareTestNavigation(event) {
    if (!agree || starting) {
      event.preventDefault();
      return;
    }
    // Keep the browser's native anchor navigation: this works even if a
    // client-side route transition stalls or the page is restored from cache.
    try {localStorage.setItem(languageKey,language);} catch {}
    setStarting(true);
  }

  useEffect(() => {
    const clearStaleNavigation = () => setStarting(false);
    window.addEventListener("pageshow", clearStaleNavigation);
    return () => window.removeEventListener("pageshow", clearStaleNavigation);
  }, []);
  const header = <div className="nav" style={{display:"flex",alignItems:"center",gap:12}}>
    <Image src="/jd-exambook-logo.png" alt="JD Exambook Logo" width={46} height={46} priority style={{objectFit:"contain",borderRadius:8}}/>
    <div><div style={{fontWeight:700,fontSize:19}}>JD Exambook</div><div style={{fontSize:12,opacity:.85}}>Test Instructions / परीक्षा निर्देश</div></div>
  </div>;
  if (loading) return <>{header}<main className="wrap"><div className="card">Loading test instructions... / निर्देश लोड हो रहे हैं...</div></main></>;
  if (error || !test) return <>{header}<main className="wrap"><div className="card" role="alert">{error || "Test not found"}</div></main></>;
  if (!signedIn) return <>{header}<main className="wrap"><div className="card"><h2>{test.title}</h2>
    <p>टेस्ट प्रारम्भ करने से पहले लॉगिन करें। लॉगिन के बाद आप इसी टेस्ट के निर्देशों पर लौटेंगे।</p>
    <p>Please log in to view exam-specific instructions. You will return here after login.</p>
    <button className="btn" onClick={()=>router.push(loginPath)} style={{width:"100%"}}>Login to Continue / लॉगिन करें</button>
  </div></main></>;
  if (!config?.stage) return <>{header}<main className="wrap"><div className="card">Exam pattern unavailable / परीक्षा पैटर्न उपलब्ध नहीं है</div></main></>;

  const stage = config.stage;
  const exam = config.exam || {};
  const sections = [...(config.sections || [])].sort((a,b)=>Number(a.display_order)-Number(b.display_order));
  const sectional = stage.timer_type === "sectional";
  const totalQuestions = stage.total_questions || test.total_questions;
  const totalMarks = stage.total_marks || test.total_marks;
  const duration = stage.duration_minutes || test.duration_minutes;
  const positive = Number(stage.marks_per_question || 0);
  const negative = Number(stage.negative_mark ?? test.negative_mark ?? 0);
  const en = [
    "The " + (exam.exam_name || "examination") + " (" + (stage.stage_name || stage.stage_code) + ") contains " + fmt(totalQuestions) + " objective multiple-choice questions carrying " + fmt(totalMarks) + " marks.",
    "Total examination duration: " + fmt(duration) + " minutes.",
    "Each correct answer carries " + positive + " mark(s); " + negative + " mark(s) will be deducted for an incorrect answer.",
    "Unattempted questions do not carry negative marks.",
    ...(sectional
      ? ["Each section has its own fixed timer as shown in the table above.",
         "Only questions of the active section can be opened. When its allotted time expires, the section automatically locks and the test moves to the next section.",
         "A locked or submitted section cannot be revisited. The test automatically ends after the last section expires."]
      : ["There is one overall examination timer, not a separate timer for each subject.",
         "You may move between all subjects and revisit their questions while overall time remains.",
         "The entire test ends automatically when the overall time expires."]),
    "Use Save & Next, Clear Response and Mark & Next as needed; check that your answer is saved.",
    "Do not refresh or close the page while submitting your final answers."
  ];
  const hi = [
    (exam.exam_name || "परीक्षा") + " (" + (stage.stage_name || stage.stage_code) + ") में कुल " + fmt(totalQuestions) + " बहुविकल्पीय प्रश्न होंगे, जिनके " + fmt(totalMarks) + " अंक निर्धारित हैं।",
    "परीक्षा की कुल अवधि " + fmt(duration) + " मिनट है।",
    "प्रत्येक सही उत्तर पर " + positive + " अंक मिलेंगे तथा प्रत्येक गलत उत्तर पर " + negative + " अंक काटे जाएँगे।",
    "अनुत्तरित प्रश्नों पर कोई ऋणात्मक अंक नहीं कटेगा।",
    ...(sectional
      ? ["ऊपर दी गई तालिका के अनुसार प्रत्येक अनुभाग का अलग निश्चित समय होगा।",
         "केवल सक्रिय अनुभाग के प्रश्न खोले जा सकेंगे। समय पूरा होने पर अनुभाग स्वतः लॉक होकर अगला अनुभाग प्रारम्भ होगा।",
         "लॉक या सबमिट हो चुके अनुभाग में वापस नहीं जा सकेंगे। अंतिम अनुभाग का समय समाप्त होने पर पूरी परीक्षा समाप्त हो जाएगी।"]
      : ["सभी विषयों के लिए एक ही कुल परीक्षा-समय है; अलग-अलग अनुभागीय टाइमर नहीं हैं।",
         "कुल समय शेष रहने तक किसी भी विषय के प्रश्नों पर जा सकते हैं और वापस आ सकते हैं।",
         "कुल समय समाप्त होने पर पूरा टेस्ट स्वतः समाप्त हो जाएगा।"]),
    "आवश्यकतानुसार Save & Next, Clear Response तथा Mark & Next का प्रयोग करें और उत्तर सेव होने की पुष्टि करें।",
    "अंतिम उत्तर सबमिट करते समय पेज रिफ्रेश या बंद न करें।"
  ];
  const summary = [["Total Questions / कुल प्रश्न",fmt(totalQuestions)],
    ["Total Marks / कुल अंक",fmt(totalMarks)],
    ["Duration / कुल समय",fmt(duration) + " min"],
    ["Wrong Answer / गलत उत्तर कटौती",fmt(negative)]];
  return <>{header}<main className="wrap">
    <div className="card"><h2 style={{marginTop:0}}>{test.title}</h2>
      <p className="muted">{exam.exam_name || "SSC Examination"} — {stage.stage_name || stage.stage_code}</p>
      <p>परीक्षा प्रारम्भ करने से पहले सभी निर्देश ध्यानपूर्वक पढ़ें।</p>
    </div>
    <div className="card"><h2 style={{marginTop:0}}>Test Summary / परीक्षा विवरण</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(120px,1fr))",gap:12}}>
        {summary.map(([label,value])=><div key={label} style={{border:"1px solid #d7deea",borderRadius:12,padding:14,background:"#f8fafc"}}>
          <div style={{fontWeight:700,fontSize:13}}>{label}</div><div style={{fontSize:23,fontWeight:800,marginTop:7}}>{value}</div>
        </div>)}
      </div>
    </div>
    <div className="card"><h2 style={{marginTop:0}}>{sectional ? "Sectional Timing / अनुभागीय समय" : "Subject Distribution / विषयवार प्रश्न"}</h2>
      <p>{sectional ? "Every section has a separate timer. / प्रत्येक अनुभाग का अपना निर्धारित टाइमर है।"
        : "One overall timer applies to all subjects. / सभी विषयों के लिए केवल एक कुल टाइमर है।"}</p>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:510}}>
        <thead><tr>{["Section / अनुभाग","Questions / प्रश्न","Marks / अंक","Time / समय"].map(t=><th key={t} style={cell}>{t}</th>)}</tr></thead>
        <tbody>{sections.map((sec,index)=><tr key={sec.section_id || index}>
          <td style={cell}>{sec.section_name}<div style={{fontWeight:600}}>{sec.section_name_hi || sec.section_name}</div></td>
          <td style={cell}>{sec.question_count}</td>
          <td style={cell}>{fmt(sec.total_marks ?? Number(sec.question_count)*Number(sec.marks_per_question || positive))}</td>
          <td style={cell}>{sectional ? String(sec.duration_minutes ?? "—") + " min" : "Overall / कुल"}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <div className="card"><h2 style={{marginTop:0}}>General Instructions</h2><ol style={list}>{en.map((line,i)=><li key={i}>{line}</li>)}</ol></div>
    <div className="card"><h2 style={{marginTop:0}}>सामान्य निर्देश</h2><ol style={list}>{hi.map((line,i)=><li key={i}>{line}</li>)}</ol></div>
    <div className="card"><h2 style={{marginTop:0}}>Default Exam Language / डिफॉल्ट भाषा</h2>
      <label style={{display:"block",fontWeight:700}}>Select Language / भाषा चुनें
        <select value={language} onChange={e=>changeLanguage(e.target.value)} style={{display:"block",width:"100%",padding:13,marginTop:9,border:"2px solid #1769e0",borderRadius:9,fontWeight:700}}>
          <option value="english">English</option><option value="hindi">हिन्दी</option>
        </select></label><p className="muted">परीक्षा के दौरान Change Language विकल्प भी उपलब्ध रहेगा।</p>
    </div>
    <div className="card"><h2 style={{marginTop:0}}>Declaration / घोषणा</h2>
      <label style={{display:"flex",gap:12,alignItems:"flex-start",lineHeight:1.6,fontWeight:600}}>
        <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} style={{width:22,height:22,flexShrink:0}}/>
        <span>I have read and understood all exam-specific instructions.<div>मैंने परीक्षा-विशिष्ट सभी निर्देश पढ़ एवं समझ लिए हैं।</div></span>
      </label>
      <a className="btn" href={agree ? "/test/" + encodeURIComponent(id) : undefined}
        aria-disabled={!agree || starting} onClick={prepareTestNavigation}
        style={{display:"block",textAlign:"center",textDecoration:"none",width:"100%",boxSizing:"border-box",padding:15,marginTop:20,opacity:agree && !starting ? 1:.5,cursor:agree && !starting ? "pointer" : "not-allowed"}}>
        {starting ? "Opening Test... / टेस्ट खुल रहा है..." : "Agree & Start Test / सहमत हूँ एवं परीक्षा प्रारम्भ करें"}
      </a>
    </div>
  </main></>;
}
