"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "../../lib/supabase";
const style={fontFamily:"Arial,sans-serif",background:"#f5f8fc",minHeight:"100vh",padding:"24px 14px 92px",color:"#10243c"};
const card={background:"#fff",border:"1px solid #dfe7ee",borderRadius:16,padding:22,boxShadow:"0 4px 20px #15294608"};
export default function CurrentAffairs(){
 const [news,setNews]=useState([]),[batches,setBatches]=useState([]),[active,setActive]=useState(null),[questions,setQuestions]=useState([]),[answers,setAnswers]=useState({}),[result,setResult]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let live=true;const db=supabase();Promise.all([
  db.from("ca_items").select("id,headline_en,headline_hi,summary_en,summary_hi,canonical_url,published_at,topics").order("published_at",{ascending:false}).limit(40),
  db.from("ca_batches").select("id,batch_type,batch_date,title_en,title_hi,scheduled_at").order("scheduled_at",{ascending:false}).limit(30)
 ]).then(([a,b])=>{if(!live)return;if(a.error||b.error)setError("Updates could not be loaded. Please refresh.");else{setNews(a.data||[]);setBatches(b.data||[])}setLoading(false)}).catch(()=>{if(live){setError("Unable to connect to Current Affairs.");setLoading(false)}});return()=>{live=false}},[]);
 async function openQuiz(batch){setBusy(true);setError("");setResult(null);setAnswers({});const {data,error:e}=await supabase().rpc("ca_get_quiz",{p_batch_id:batch.id});if(e||!data?.available){setError("This quiz is not available yet.");setQuestions([]);setActive(null)}else{setActive(batch);setQuestions(data.questions||[])}setBusy(false);}
 async function submitQuiz(){if(!active||!questions.length||busy)return;setBusy(true);setError("");const {data,error:e}=await supabase().rpc("ca_grade_quiz",{p_batch_id:active.id,p_answers:answers});if(e)setError("Your answers could not be checked. Please try again.");else setResult(data);setBusy(false)}
 const weekly=batches.filter(x=>x.batch_type==="weekly"),daily=batches.filter(x=>x.batch_type==="daily");
 return <main style={style}><div style={{maxWidth:1050,margin:"auto"}}>
 <Link href="/" style={{color:"#008e68",fontWeight:700}}>← JD Exambook Home</Link>
 <header style={{...card,margin:"18px 0 22px",background:"linear-gradient(120deg,#e2f7ee,#e6f0ff)"}}><strong style={{color:"#00885f"}}>JD Exambook</strong><h1 style={{fontSize:"clamp(25px,4vw,36px)",margin:"10px 0"}}>Current Affairs / करेंट अफेयर्स</h1><p>Daily verified updates • SSC • Railway • Banking • State Exams</p></header>
 {error&&<p role="alert" style={{background:"#fff0f0",padding:12,borderRadius:8,color:"#9b1c1c"}}>{error}</p>}
 <section style={card}><h2 style={{marginTop:0}}>Latest Verified News / नवीनतम समाचार</h2>
 {loading?<p>Loading updates...</p>:news.length===0?<p>समाचार अभी Editorial Review में हैं। सत्यापित होने के बाद यहाँ दिखाई देंगे।</p>:
 news.map(n=><article key={n.id} style={{borderBottom:"1px solid #e5ecf0",padding:"12px 0"}}><h3 style={{marginBottom:6}}>{n.headline_hi||n.headline_en}</h3><p>{n.headline_en}</p><p>{n.summary_hi}</p><p style={{color:"#637184"}}>{n.summary_en}</p><small>{new Date(n.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} • <a target="_blank" rel="noopener noreferrer" href={n.canonical_url}>Original Source ↗</a></small></article>)}
 </section>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18,marginTop:18}}>
 <section id="daily-quiz" style={card}><h2>📝 Daily Quiz (Free)</h2><p>रोज सुबह 8:00 बजे IST • Source-reviewed bilingual questions</p>{daily.length===0?<p>अभी स्वीकृत क्विज़ उपलब्ध नहीं है।</p>:daily.map(x=><button key={x.id} style={{display:"block",width:"100%",margin:"10px 0",padding:12,border:"1px solid #00a86b",borderRadius:9,background:"#f2fff8",cursor:"pointer",textAlign:"left"}} disabled={busy} onClick={()=>openQuiz(x)}>{x.title_hi} — {x.batch_date} →</button>)}</section>
 <section id="weekly-test" style={card}><h2>📅 Weekly Revision</h2><p>हर रविवार सुबह 10:00 बजे IST • पिछले सप्ताह के सत्यापित प्रश्न</p>{weekly.length===0?<p>साप्ताहिक टेस्ट स्वीकृत प्रश्न उपलब्ध होने पर जारी होगा।</p>:weekly.map(x=><button key={x.id} style={{display:"block",width:"100%",margin:"10px 0",padding:12,border:"1px solid #0866c2",borderRadius:9,background:"#f3f8ff",cursor:"pointer",textAlign:"left"}} disabled={busy} onClick={()=>openQuiz(x)}>{x.title_hi} — {x.batch_date} →</button>)}</section>
 </div>
 {active&&<section aria-label="Current affairs quiz" style={{...card,marginTop:22}}><h2>{active.title_hi} — {active.batch_date}</h2><p style={{color:"#536575"}}>पहले अपने उत्तर चुनें। Submit करने के बाद ही सही उत्तर और व्याख्या दिखाई जाएगी।</p>
 {questions.length===0?<p>इस क्विज़ में अभी प्रश्न उपलब्ध नहीं हैं।</p>:questions.map((q,index)=><div key={q.id} style={{padding:"16px 0",borderBottom:"1px solid #edf0f4"}}><h3 style={{fontSize:17}}>{index+1}. {q.question_hi}</h3><p>{q.question_en}</p>{["A","B","C","D"].map((letter,j)=><label key={letter} style={{display:"block",padding:"10px 12px",margin:"7px 0",border:"1px solid #dbe3ed",borderRadius:9,cursor:result?"default":"pointer"}}><input type="radio" name={"ca-"+q.id} value={letter} disabled={!!result} checked={answers[q.id]===letter} onChange={()=>setAnswers(a=>({...a,[q.id]:letter}))}/> <b>{letter}.</b> {q.options_hi?.[j]} / {q.options_en?.[j]}</label>)}</div>)}
 {!result&&questions.length>0&&<button disabled={busy||!Object.keys(answers).length} onClick={submitQuiz} style={{background:"#00a86b",color:"white",border:0,borderRadius:9,padding:"12px 24px",marginTop:16,cursor:"pointer"}}>{busy?"Checking...":"Submit Answers / उत्तर जमा करें"}</button>}
 {result&&<div role="status"><h3>आपका परिणाम: {result.correct} / {result.total}</h3>{result.results?.map((r,i)=><article key={r.id} style={{padding:"12px 0",borderTop:"1px solid #e5ecf0"}}><b>Question {i+1}: Correct answer — {r.correct}</b><p>{r.explanation_hi}</p><p>{r.explanation_en}</p><a href={r.source_url} target="_blank" rel="noopener noreferrer">Verified Source ↗</a></article>)}</div>}
 </section>}
 </div></main>
}