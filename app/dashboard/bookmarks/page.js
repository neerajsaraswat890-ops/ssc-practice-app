"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import QuestionChart from "../../../components/QuestionChart";

export default function SavedQuestions(){
 const router=useRouter();
 const [subjects,setSubjects]=useState([]);
 const [subject,setSubject]=useState("");
 const [items,setItems]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [removing,setRemoving]=useState(null);
 const [language,setLanguage]=useState("hindi");
 useEffect(()=>{let active=true;(async()=>{
  const db=supabase(),{data:auth,error:authError}=await db.auth.getUser();
  if(!active)return;
  if(authError||!auth?.user||auth.user.is_anonymous){router.replace("/login?next=%2Fdashboard%2Fbookmarks");return;}
  const {data,error:e}=await db.rpc("jd_bookmark_subject_counts");
  if(!active)return;
  if(e)setError("बुकमार्क सूची नहीं खुल सकी: "+e.message);
  else setSubjects(data||[]);
  setLoading(false);
 })();return()=>{active=false}},[router]);
 useEffect(()=>{let alive=true;(async()=>{if(loading)return;
  setError("");
  const {data,error:e}=await supabase().rpc("jd_get_my_question_bookmarks",{p_subject:subject||null,p_limit:200,p_offset:0});
  if(!alive)return;
  if(e)setError("प्रश्न लोड नहीं हुए: "+e.message);
  else setItems(data||[]);
 })();return()=>{alive=false}},[subject,loading]);
 async function remove(item){
  if(removing!==null)return;
  setRemoving(item.question_id);setError("");
  const {error:e}=await supabase().rpc("jd_set_question_bookmark",{p_test_id:item.test_id,p_question_id:item.question_id,p_bookmarked:false});
  if(e)setError("Bookmark नहीं हट सका: "+e.message);
  else {setItems(old=>old.filter(x=>x.question_id!==item.question_id));setSubjects(old=>old.map(s=>s.subject===item.subject?{...s,question_count:Math.max(0,Number(s.question_count)-1)}:s).filter(s=>Number(s.question_count)>0));}
  setRemoving(null);
 }
 return <main className="wrap" style={{maxWidth:1080,margin:"auto",padding:"22px 14px 70px"}}>
  <Link href="/dashboard" style={{color:"#0866c2",fontWeight:700}}>← Dashboard</Link>
  <header className="card" style={{padding:24,background:"linear-gradient(115deg,#e8fff2,#eaf2ff)",margin:"16px 0"}}>
   <h1 style={{margin:0,fontSize:28}}>★ Bookmarked Questions / बुकमार्क प्रश्न</h1>
   <p style={{marginBottom:0}}>टेस्ट में सहेजे गए प्रश्न विषयवार देखें। टेस्ट पूरा होने तक उसके प्रश्नों का विवरण सुरक्षित रखा जाता है।</p>
  </header>
  <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:18}}>
   <button onClick={()=>setSubject("")} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #d0dbe6",background:subject?"white":"#0866c2",color:subject?"#17243b":"white",fontWeight:700}}>All Subjects ({subjects.reduce((s,x)=>s+Number(x.question_count),0)})</button>
   {subjects.map(s=><button key={s.subject} onClick={()=>setSubject(s.subject)} style={{padding:"10px 14px",borderRadius:10,border:"1px solid #d0dbe6",background:subject===s.subject?"#0866c2":"white",color:subject===s.subject?"white":"#17243b",fontWeight:700}}>{s.subject} ({s.question_count})</button>)}
  </div>
  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:18}}><label htmlFor="bookmark-language">Language / भाषा:</label><select id="bookmark-language" value={language} onChange={e=>setLanguage(e.target.value)} style={{padding:8,borderRadius:7}}><option value="hindi">हिन्दी + English</option><option value="english">English</option></select></div>
  {error&&<p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
  {loading?<p>बुकमार्क लोड हो रहे हैं...</p>:!items.length?<div className="card" style={{padding:24}}>अभी इस विषय में कोई Bookmarked Question नहीं है। टेस्ट देते समय ☆ Bookmark दबाकर प्रश्न सहेजें।</div>:
  items.map((q,index)=><article key={q.question_id} className="card" style={{padding:20,marginBottom:14,border:"1px solid #dce5ee"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
    <strong style={{color:"#0866c2"}}>{q.subject} {q.chapter?" · "+q.chapter:""} {q.topic?" · "+q.topic:""}</strong>
    <button disabled={removing!==null} onClick={()=>remove(q)} style={{background:"#fff",border:"1px solid #d48a8a",color:"#a12732",borderRadius:8,padding:"7px 11px",fontWeight:700,cursor:"pointer"}}>★ Remove Bookmark</button>
   </div>
   <p style={{fontSize:12,color:"#64748b"}}>{q.test_title} · {new Date(q.bookmarked_at).toLocaleDateString("en-IN")}</p>
   {!q.ready?<p style={{background:"#fff7e6",padding:12,borderRadius:9}}>यह टेस्ट अभी पूरा नहीं हुआ है। Test Submit होने के बाद यहाँ प्रश्न और विकल्प दिखाई देंगे।</p>:<>
    <h3 style={{lineHeight:1.55,fontSize:17}}>{index+1}. {language==="hindi"&&(q.question_text_hi||q.question_text)?q.question_text_hi||q.question_text:q.question_text}</h3>
    {language==="hindi"&&q.question_text_hi&&<p style={{color:"#64748b"}}>{q.question_text}</p>}
    {q.chart_asset_id&&<QuestionChart assetId={q.chart_asset_id} language={language}/>}
    {["a","b","c","d"].map((o,j)=><p key={o} style={{border:"1px solid #e7edf3",padding:10,borderRadius:8,margin:"7px 0"}}><b>{["A","B","C","D"][j]}.</b> {language==="hindi"?(q["option_"+o+"_hi"]||q["option_"+o]):q["option_"+o]}{language==="hindi"&&q["option_"+o+"_hi"]&&" / "+q["option_"+o]}</p>)}
   </>}
  </article>)}
  {items.length===200&&<p style={{color:"#64748b"}}>पहले 200 प्रश्न दिख रहे हैं।</p>}
 </main>
}