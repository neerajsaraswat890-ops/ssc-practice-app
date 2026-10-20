"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "../../../lib/supabase";
const skin={maxWidth:1050,margin:"30px auto",padding:"0 16px 60px",fontFamily:"Arial,sans-serif",color:"#17223a"};
const inp={display:"block",width:"100%",margin:"8px 0 12px",padding:11,borderRadius:8,border:"1px solid #ccd8e5",font:"inherit"};
const btn={background:"#008e65",border:0,color:"white",borderRadius:8,padding:"10px 15px",cursor:"pointer",marginRight:8};
export default function CAEditor(){
 const [items,setItems]=useState([]),[questions,setQuestions]=useState([]),[selected,setSelected]=useState(null),[userAllowed,setAllowed]=useState(false),[working,setWorking]=useState(true),[message,setMessage]=useState(""),[notes,setNotes]=useState("");
 const [fields,setFields]=useState({headline_hi:"",summary_hi:"",summary_en:"",topics:""});
 async function load(){const db=supabase();const {data:u}=await db.auth.getUser();if(!u?.user){setWorking(false);setAllowed(false);return}
 const {data:a,error:e}=await db.rpc("ca_editor_news_queue");const {data:b}=await db.rpc("ca_editor_question_queue");
 setAllowed(!e);if(!e){setItems(a||[]);setQuestions(b||[])}setWorking(false)}
 useEffect(()=>{load()},[]);
 function open(i){setSelected(i);setFields({headline_hi:i.headline_hi||"",summary_hi:i.summary_hi||"",summary_en:i.summary_en||"",topics:(i.topics||[]).join(", ")});setMessage("");setNotes("")}
 async function save(){if(!selected)return;setWorking(true);const {error:e}=await supabase().rpc("ca_editor_save_news",{p_id:selected.id,p_headline_hi:fields.headline_hi,p_summary_hi:fields.summary_hi,p_summary_en:fields.summary_en,p_topics:fields.topics.split(",").map(s=>s.trim()).filter(Boolean)});setMessage(e?.message||"Draft saved. Verify source before approval.");await load()}
 async function review(approve){if(!selected||!notes.trim()){setMessage("Source review notes are required.");return}setWorking(true);const {error:e}=await supabase().rpc("ca_editor_review_item",{p_item_id:selected.id,p_approve:approve,p_evidence_url:selected.canonical_url,p_notes:notes});setMessage(e?.message||(approve?"Approved and published.":"Rejected."));setSelected(null);await load()}
 async function reviewQ(id,approve){const reason=window.prompt("Explain your factual/answer verification and editorial decision (minimum 8 characters):");if(!reason)return;const {error:e}=await supabase().rpc("ca_editor_review_question",{p_question_id:id,p_approve:approve,p_notes:reason});setMessage(e?.message||(approve?"Question approved.":"Question moved to draft."));await load()}
 return <main style={skin}><Link href="/current-affairs">← Current Affairs</Link><h1>Current Affairs — Editorial Review (Testing)</h1><p>Only accounts assigned the trusted editor/admin role may access this queue. Do not approve news until you have independently checked the original source, date, and bilingual summaries.</p>{message&&<p role="status" style={{background:"#edf8f2",padding:12,borderRadius:8}}>{message}</p>}
 {working&&<p>Loading editor...</p>}{!working&&!userAllowed&&<p role="alert">Access restricted. Sign in with an account assigned editor/admin in trusted app metadata.</p>}
 {userAllowed&&<><h2>News queue ({items.length})</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
 {items.map(i=><button key={i.id} onClick={()=>open(i)} style={{textAlign:"left",background:i.status==="pending"?"#fff9e8":"#eaf6f0",padding:13,border:"1px solid #dce5ee",borderRadius:10,cursor:"pointer"}}><strong>{i.headline_en}</strong><p>{i.source_name} • {i.status}</p><small>{new Date(i.published_at).toLocaleString("en-IN")}</small></button>)}</div>
 {selected&&<section style={{marginTop:24,padding:20,border:"1px solid #dce5ee",borderRadius:12}}><h2>Review source #{selected.id}</h2><a href={selected.canonical_url} rel="noopener noreferrer" target="_blank">Open original official report ↗</a><p>{selected.headline_en}</p>
 <label>Hindi headline<input style={inp} value={fields.headline_hi} onChange={e=>setFields(f=>({...f,headline_hi:e.target.value}))}/></label>
 <label>Hindi summary<textarea style={inp} rows={4} value={fields.summary_hi} onChange={e=>setFields(f=>({...f,summary_hi:e.target.value}))}/></label>
 <label>English summary<textarea style={inp} rows={4} value={fields.summary_en} onChange={e=>setFields(f=>({...f,summary_en:e.target.value}))}/></label>
 <label>Topics (comma-separated)<input style={inp} value={fields.topics} onChange={e=>setFields(f=>({...f,topics:e.target.value}))}/></label>
 <label>Source-verification notes<textarea style={inp} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What facts, dates and original source did you check?"/></label>
 <button style={btn} disabled={working||selected.status!=="pending"} onClick={save}>Save draft</button><button style={btn} disabled={working||selected.status!=="pending"} onClick={()=>review(true)}>Approve verified news</button><button style={{...btn,background:"#9d2835"}} disabled={working||selected.status!=="pending"} onClick={()=>review(false)}>Reject</button>
 </section>}
 <h2>Question review ({questions.length})</h2><p>Only independently validated bilingual questions should be released; answer key and source must be reviewed.</p>{questions.map(q=><div key={q.id} style={{borderBottom:"1px solid #e3e8ef",padding:"12px 0"}}><strong>#{q.id} / Item #{q.item_id}: {q.question_en}</strong><p>{q.question_hi}</p><small>Status: {q.status}</small><div style={{marginTop:8}}><button style={btn} disabled={working} onClick={()=>reviewQ(q.id,true)}>Approve after QA</button><button style={{...btn,background:"#9d2835"}} disabled={working} onClick={()=>reviewQ(q.id,false)}>Return to draft</button></div></div>)}
 </>}
 </main>;
}