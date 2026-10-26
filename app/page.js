
"use client";
import "./jd-responsive.css";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
const loginFor=(dest)=>"/login?next="+encodeURIComponent(dest);
const navItems=[
 {name:"Home",href:"/"},
 {name:"Practice",href:loginFor("/dashboard")},
 {name:"Mock Tests",href:loginFor("/dashboard")},
 {name:"Previous Year",href:loginFor("/dashboard")},
 {name:"Current Affairs",href:"/current-affairs"},
 {name:"Study Material",href:loginFor("/dashboard")}
];
const featureItems=[
 {name:"Practice Sets",icon:"▣",tone:"blue",href:loginFor("/dashboard")},
 {name:"Mock Tests",icon:"☷",tone:"green",href:loginFor("/dashboard")},
 {name:"Previous Year Papers",icon:"▤",tone:"yellow",href:loginFor("/dashboard")},
 {name:"Current Affairs",icon:"▤",tone:"red",href:"/current-affairs"},
 {name:"Free Quizzes",icon:"◉",tone:"purple",href:"/current-affairs#daily-quiz"},
 {name:"Study Material",icon:"▧",tone:"orange",href:loginFor("/dashboard")}
];
const examItems=[
 {title:"SSC",subtitle:"CGL, CHSL, MTS",icon:"▣",tone:"coral",href:loginFor("/exams/SSC_CGL")},
 {title:"Railway",subtitle:"NTPC, Group D",icon:"▥",tone:"blue",href:loginFor("/exams/RRB_NTPC")},
 {title:"Banking",subtitle:"IBPS, SBI, RBI",icon:"▤",tone:"green",href:loginFor("/dashboard")},
 {title:"State Exams",subtitle:"UP, Bihar, MP, etc.",icon:"✦",tone:"purple",href:loginFor("/exams/UPP_CONSTABLE")}
];
const moreItems=[
 {name:"Subject-wise Practice",href:loginFor("/exams/SSC_CGL/subject-wise")},
 {name:"Chapter-wise Practice",href:loginFor("/exams/SSC_CGL/chapter-wise")},
 {name:"Study Material",href:loginFor("/dashboard")},
 {name:"Daily Quiz",href:"/current-affairs#daily-quiz"},
 {name:"Weekly Test",href:"/current-affairs#weekly-test"}
];
const tabs=["Latest","National","International","Economy","Defence","Sports","Science"];
function Mark({small=false}){
return <span className={"jd-blue-logo"+(small?" jd-small-logo":"")} aria-hidden="true"><svg viewBox="0 0 62 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 43 Q18 38 29 47 Q42 38 58 44 L56 51 Q42 47 31 53 Q17 47 6 51Z" fill="#0069cc"/><path d="M6 45 Q20 42 30 50 Q39 42 55 45" stroke="#f96b04" strokeWidth="3"/><path d="M16 39V21Q16 14 26 14" stroke="#0c438c" strokeWidth="9" strokeLinecap="round"/><path d="M29 13H39Q57 14 55 32Q54 41 40 42H31" stroke="#ff7b13" strokeWidth="9" strokeLinecap="round"/><path d="M17 12L34 3L53 11L35 19Z" fill="#062e76"/><path d="M35 18V27" stroke="#ff9b00" strokeWidth="3"/><circle cx="35" cy="28" r="3" fill="#ff9b00"/></svg></span>;
}
function Brand({compact=false}){return <Link href="/" className={"jdv-brand"+(compact?" jdv-brand-mini":"")}><Mark small={compact}/><span><b>JD</b> <strong>Exambook</strong></span></Link>}
function SearchBar({inHero=false}){
 const router=useRouter(); const [q,setQ]=useState("");
 const all=[...featureItems,...examItems.map(x=>({name:x.title+" "+x.subtitle,href:x.href}))];
 const matches=q.trim()?all.filter(x=>x.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0,5):[];
 return <form className={"jdv-search"+(inHero?" jdv-mobile-search":"")} onSubmit={e=>{e.preventDefault();if(matches[0])router.push(matches[0].href)}} role="search">
 <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" stroke="#567095" strokeWidth="1.8" fill="none"><circle cx="10.7" cy="10.7" r="6.5"/><path d="m16 16 5 5"/></svg>
 <input aria-label="Search tests, topics, exams" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tests, topics, exams..." autoComplete="off"/>
 {matches.length>0&&<div className="jdv-search-results">{matches.map((a,i)=><Link href={a.href} key={i} onClick={()=>setQ("")}>{a.name} <span>→</span></Link>)}</div>}
 </form>
}
function HeroGraphic(){
return <div className="jdv-hero-graphic" aria-hidden="true"><div className="jdv-art-glow"/><div className="jdv-art-chip chip-practice">▣ <span>Practice</span></div><div className="jdv-art-chip chip-mock">▤ <span>Mock Tests</span></div><div className="jdv-art-chip chip-news">▧ <span>Current Affairs</span></div><div className="jdv-art-chip chip-prev">✦ <span>Previous Year</span></div><div className="jdv-art-chip chip-study">▧ <span>Study Anytime</span></div>
<svg className="jdv-illustration" viewBox="0 0 460 310" role="img" aria-label="Graduation cap on books">
<defs><linearGradient id="jdBookBlue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#006ef6"/><stop offset="1" stopColor="#003c9d"/></linearGradient><linearGradient id="jdHat" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#0f63c8"/><stop offset="1" stopColor="#001f66"/></linearGradient><linearGradient id="jdOrange" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffae42"/><stop offset="1" stopColor="#ff6400"/></linearGradient></defs>
<ellipse cx="235" cy="285" rx="165" ry="13" fill="#bfd8f2" opacity=".65"/>
<path d="M135 257 Q138 248 152 247 L330 247 L344 273 L147 273Z" fill="#0360ac"/><path d="M149 251H334L340 269H153Q144 259 149 251Z" fill="#fff" stroke="#c5d8e7" strokeWidth="3"/><path d="M140 274H345" stroke="#043d8d" strokeWidth="7" strokeLinecap="round"/>
<path d="M170 217H334L326 246H169Q156 238 170 217Z" fill="#ff880f"/><path d="M177 221H327L321 241H176Q169 232 177 221Z" fill="#fff9f3" stroke="#ffc184" strokeWidth="2"/><path d="M171 217H336" stroke="#f16b00" strokeWidth="6" strokeLinecap="round"/>
<path d="M143 187H317L325 215H144Q130 204 143 187Z" fill="url(#jdBookBlue)"/><path d="M149 191H314L319 211H148Q143 204 149 191Z" fill="#f6fbff" stroke="#8db8e6" strokeWidth="2"/><path d="M141 215H327" stroke="#0251a8" strokeWidth="6" strokeLinecap="round"/>
<path d="M209 141L245 130L302 153L294 194Q243 216 198 191Z" fill="#0b3b85"/><path d="M201 164Q239 183 298 165V195Q239 220 201 191Z" fill="#04347f"/>
<path d="M122 125L246 77L370 125L246 176Z" fill="url(#jdHat)" stroke="#003c90" strokeWidth="5"/><path d="M122 125L246 86L370 125L246 166Z" fill="#0d52af" opacity=".5"/><circle cx="246" cy="125" r="6.5" fill="#ff9713"/><path d="M246 124C295 121 324 133 324 155V195" stroke="#ff9713" strokeWidth="5" fill="none"/><path d="M324 193L318 212L330 212Z" fill="#ff7a00"/><path d="M317 212Q324 218 331 212" stroke="#ef6000" strokeWidth="3" fill="none"/>
</svg></div>
}
function NewsSidebar(){
 const [items,setItems]=useState([]);const [tab,setTab]=useState("Latest");const [loading,setLoading]=useState(true);
 useEffect(()=>{let mounted=true;try{supabase().from("ca_items").select("id,headline_en,headline_hi,summary_en,canonical_url,published_at,topics,exam_priority").in("status",["approved","published"]).not("visible_at","is",null).lte("visible_at",new Date().toISOString()).order("exam_priority",{ascending:false}).order("published_at",{ascending:false}).limit(35).then(({data,error})=>{if(!mounted)return;if(!error)setItems(data||[]);setLoading(false)}).catch(()=>{if(mounted)setLoading(false)})}catch{setLoading(false)}return()=>{mounted=false}},[]);
 const filtered=tab==="Latest"?items:items.filter(i=>(i.topics||[]).some(t=>t.toLowerCase()===tab.toLowerCase()));
 return <aside className="jdv-ca-box" aria-label="Daily Current Affairs">
 <div className="jdv-ca-banner"><span className="jdv-ca-bicon">♙</span><div><strong>Current Affairs</strong><small>Exam-Focused Daily Updates</small></div><span className="jdv-free">FREE</span></div>
 <div className="jdv-tabs" role="tablist" aria-label="News categories">{tabs.map(t=><button role="tab" aria-selected={tab===t} className={tab===t?"selected":""} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div>
 <div className="jdv-news-list">{filtered.length?filtered.slice(0,5).map((n,index)=><Link className="jdv-news-row" key={n.id} href={"/current-affairs/"+n.id}><span className="jdv-news-copy"><strong><span className="jdv-news-number">{index+1}</span>{n.headline_hi||n.headline_en}</strong><small>{new Date(n.published_at).toLocaleDateString("hi-IN",{day:"numeric",month:"long",year:"numeric"})}</small></span><span className="jdv-arrow">›</span></Link>):
 <div className="jdv-empty-news"><span className="jdv-empty-icon">◷</span><strong>{loading?"Latest news is loading...":"Verified news coming soon"}</strong><p>{loading?"Checking published updates.":"Official-source updates will appear here after editorial approval. Sample headlines are not displayed as real news."}</p><div className="jdv-skeleton-lines" aria-hidden="true"><i/><i/><i/><i/></div></div>}</div>
 <Link className="jdv-all-news" href="/current-affairs">View All Current Affairs <span>→</span></Link>
 <div className="jdv-ca-links"><Link href="/current-affairs#daily-quiz"><span className="jdv-quick-icon red">▣</span><span><b>Daily Quiz</b><small>(Free for All)</small></span></Link><Link href="/current-affairs#weekly-test"><span className="jdv-quick-icon purple">▦</span><span><b>Weekly Test</b><small>(Sunday 10:00 AM)</small></span></Link></div>
 </aside>
}
export default function HomePage(){
 const [moreOpen,setMoreOpen]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);
 return <div className="jdv-root">
 <div className="jdv-shell">
 <header className="jdv-topbar"><Brand/>
 <nav aria-label="Main navigation" className="jdv-desktop-nav">{navItems.map(n=><Link className={n.name==="Home"?"active":""} href={n.href} key={n.name}>{n.name}</Link>)}<div className="jdv-more"><button aria-expanded={moreOpen} aria-label="More categories" onClick={()=>setMoreOpen(v=>!v)}>More <span>⌄</span></button>{moreOpen&&<div className="jdv-dropdown">{moreItems.map(n=><Link href={n.href} key={n.name} onClick={()=>setMoreOpen(false)}>{n.name}</Link>)}</div>}</div></nav>
 <SearchBar/>
 <div className="jdv-account"><Link href="/login" className="jdv-login-btn">Login</Link><Link href="/login?mode=signup" className="jdv-sign-btn">Sign Up</Link></div>
 <button className="jdv-hamburger" type="button" aria-expanded={mobileMenu} aria-label="Open navigation" onClick={()=>setMobileMenu(v=>!v)}>☰</button>
 </header>
 {mobileMenu&&<nav className="jdv-mobile-drawer" aria-label="Mobile menu">{navItems.map(n=><Link key={n.name} href={n.href} onClick={()=>setMobileMenu(false)}>{n.name}</Link>)}{moreItems.map(n=><Link key={n.name} href={n.href} onClick={()=>setMobileMenu(false)}>{n.name}</Link>)}<Link href="/login">Login / Sign Up</Link></nav>}
 <main className="jdv-layout"><div className="jdv-left-content">
 <section className="jdv-hero"><div className="jdv-hero-text"><div className="jdv-mobile-only jdv-trust">♛ India’s Trusted</div><h1>India’s Trusted<br/><em>Exam Preparation</em><br/>Platform</h1><p>Practice with latest questions, mock tests, previous year papers and daily current affairs. All in one place. 100% Free for students.</p><Link className="jdv-start-btn" href="/login">Start Practicing Free <span>→</span></Link></div><HeroGraphic/></section>
 <SearchBar inHero/>
 <section className="jdv-benefit-strip" aria-label="Platform benefits"><div><span className="benefit-icon green">✓</span><small>100% Free<br/>for Students</small></div><div><span className="benefit-icon blue">▣</span><small>Latest Pattern<br/>Questions</small></div><div><span className="benefit-icon purple">▧</span><small>Bilingual<br/>(Hindi + English)</small></div><div><span className="benefit-icon orange">▥</span><small>Performance<br/>Analytics</small></div><div><span className="benefit-icon red">▯</span><small>Web &amp; Mobile<br/>Access</small></div></section>
 <section className="jdv-mobile-features" aria-label="Quick preparation links">{featureItems.map(f=><Link href={f.href} className="jdv-feature-card" key={f.name}><span className={"jdv-feature-icon "+f.tone}>{f.icon}</span><b>{f.name}</b></Link>)}</section>
 </div>
 <NewsSidebar/>
 <section className="jdv-exams"><div className="jdv-exams-heading"><div><h2>Popular Exams</h2><p>Choose your exam and start practicing</p></div><Link href={loginFor("/dashboard")}>View All</Link></div><div className="jdv-exam-grid">{examItems.map(e=><Link key={e.title} href={e.href} className="jdv-exam-card"><span className={"jdv-exam-graphic "+e.tone}>{e.icon}</span><span className="jdv-exam-content"><b>{e.title}</b><small>{e.subtitle}</small><span>View Tests →</span></span></Link>)}</div></section>
 </main>
 </div>
 <nav className="jdv-mobile-bottom" aria-label="Mobile bottom navigation"><Link className="active" href="/"><span>⌂</span>Home</Link><Link href={loginFor("/dashboard")}><span>▧</span>Practice</Link><Link href={loginFor("/dashboard")}><span>▣</span>Tests</Link><Link href="/current-affairs"><span>▤</span>Current Affairs</Link><button type="button" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(v=>!v)}><span>•••</span>More</button></nav>
 </div>;
}
