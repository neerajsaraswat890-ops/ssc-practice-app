
"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import {supabase} from "../../lib/supabase";
export default function CurrentAffairs(){
const [news,setNews]=useState([]),[questions,setQuestions]=useState([]),[loading,setLoading]=useState(true);
useEffect(()=>{let live=true;const db=supabase();Promise.all([
 db.from("ca_items").select("id,headline_en,headline_hi,summary_en,summary_hi,canonical_url,published_at").order("published_at",{ascending:false}).limit(30),
 db.from("ca_questions").select("id,item_id,question_en,question_hi,option_a_en,option_b_en,option_c_en,option_d_en").limit(20)
]).then(([n,q])=>{if(live){if(!n.error)setNews(n.data||[]);if(!q.error)setQuestions(q.data||[]);setLoading(false)}}).catch(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
return <main style={{fontFamily:"Arial,sans-serif",padding:"22px 14px 72px",background:"#f6f9fc",color:"#101820",minHeight:"100vh"}}><div style={{maxWidth:1020,margin:"auto"}}>
<Link href="/" style={{color:"#008f60"}}>← JD Exambook Home</Link>
<div style={{background:"linear-gradient(110deg,#e5f8ef,#e7f0ff)",borderRadius:16,padding:26,margin:"20px 0"}}><strong style={{color:"#008a60"}}>JD EXAMBOOK</strong><h1>Current Affairs — Daily Updates</h1><p>SSC, Railway, Banking and State Exams • Verified official sources only</p></div>
<section style={{background:"#fff",borderRadius:14,padding:24,border:"1px solid #e3e8ef"}}><h2>Latest Verified News</h2>
{loading?<p>Loading latest updates...</p>:!news.length?<p>Editorially approved news will appear here when available. Unverified headlines are not shown.</p>:
news.map(n=><article key={n.id} style={{padding:"16px 0",borderBottom:"1px solid #e2e8f0"}}><h3>{n.headline_en}</h3>{n.headline_hi&&<p>{n.headline_hi}</p>}{n.summary_en&&<p>{n.summary_en}</p>}<small>{new Date(n.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} • <a href={n.canonical_url} target="_blank" rel="noopener noreferrer">Official Source ↗</a></small></article>)}
</section>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16,marginTop:20}}>
<section id="daily-quiz" style={{borderRadius:13,padding:22,background:"#fff",border:"1px solid #e3e8ef"}}><h2>✍ Daily Quiz</h2><strong>Free for All</strong><p>{questions.length?questions.length+" reviewed question(s) currently available.": "Quiz will open after editorial approval of verified questions."}</p>{questions.length>0&&<p>Answer submission will be enabled after secure quiz scoring is deployed.</p>}</section>
<section id="weekly-test" style={{borderRadius:13,padding:22,background:"#fff",border:"1px solid #e3e8ef"}}><h2>🗓 Weekly Revision</h2><strong>Sunday, 10:00 AM IST</strong><p>Only published and verified questions can be included. Weekly test publishing is not active yet.</p></section>
</div></div></main>
}