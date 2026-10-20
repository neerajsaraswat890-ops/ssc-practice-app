
"use client";
import Link from "next/link";
import Image from "next/image";
import {useState} from "react";
const exams=[["SSC","CGL, CHSL, MTS","SSC_CGL","📕"],["Railway","NTPC, Group D","RRB_NTPC","🚆"],["Banking","IBPS, SBI, RBI","BANK","🏦"],["State Exams","UP, Bihar, MP","UPP_CONSTABLE","📚"]];
const more=[["Subject-wise Practice","/login?next=/dashboard"],["Chapter-wise Practice","/login?next=/dashboard"],["Daily Quiz","/current-affairs#daily-quiz"],["Weekly Test","/current-affairs#weekly-test"]];
export default function HomePage(){
const [open,setOpen]=useState(false);
return <div className="newjd">
<header className="newjd-header"><Link href="/" className="newjd-brand"><Image src="/jd-exambook-logo.png" width={44} height={44} alt="JD Exambook"/><b>JD <em>EXAMBOOK</em></b></Link>
<nav className="newjd-desktop"><Link href="/">Home</Link><Link href="/login?next=/dashboard">Mock Tests</Link><Link href="/login?next=/dashboard">Previous Year Papers</Link><Link href="/current-affairs">Current Affairs</Link><button onClick={()=>setOpen(!open)} aria-expanded={open}>More ▾</button>{open&&<div className="newjd-menu">{more.map(m=><Link onClick={()=>setOpen(false)} key={m[0]} href={m[1]}>{m[0]}</Link>)}</div>}</nav><div className="newjd-auth"><Link href="/login">Login</Link><Link href="/login" className="newjd-greenbtn">Sign Up</Link></div></header>
<main className="newjd-main"><div className="newjd-left"><section className="newjd-hero"><div><small>YOUR EXAM PREPARATION PARTNER</small><h1>Prepare Smarter.<br/><span>Achieve Your Dream.</span></h1><p>Practice for SSC, Railway, Banking and State Exams with mock tests, previous year questions and daily current affairs.</p><div className="newjd-cta"><Link href="/login" className="newjd-greenbtn">Start Practicing →</Link><Link href="/login?next=/dashboard" className="newjd-outline">Explore Tests</Link></div></div><Image className="newjd-hero-logo" src="/jd-exambook-logo.png" width={220} height={220} alt="JD Exambook"/></section>
<section className="newjd-section"><h2>Popular Exams</h2><p>Choose your exam and start practicing</p><div className="newjd-cards">{exams.map(e=><Link className="newjd-card" href={"/login?next="+encodeURIComponent("/exams/"+e[2])} key={e[0]}><span className="newjd-emoji">{e[3]}</span><strong>{e[0]}</strong><small>{e[1]}</small><b>View Tests →</b></Link>)}</div></section>
<section className="newjd-section"><h2>Practice by Topic</h2><div className="newjd-cards">{more.slice(0,2).map(m=><Link className="newjd-card" key={m[0]} href={m[1]}><span className="newjd-emoji">📚</span><strong>{m[0]}</strong><b>Explore →</b></Link>)}</div></section></div>
<aside className="newjd-side"><h2>📰 Current Affairs</h2><small>Daily Updates</small><div className="newjd-placeholder"><strong>Latest verified updates</strong><p>Headlines will appear here after source verification and editorial approval. Unverified news is not published.</p></div><Link className="newjd-outline" href="/current-affairs">View All Current Affairs →</Link><div className="newjd-side-links"><Link href="/current-affairs#daily-quiz">✍ Daily Quiz<small>Free for All</small></Link><Link href="/current-affairs#weekly-test">🗓 Weekly Test<small>Sunday 10:00 AM</small></Link></div></aside></main>
<footer className="newjd-footer">© 2026 JD Exambook. All rights reserved.</footer>
<nav className="newjd-bottom"><Link href="/">⌂<small>Home</small></Link><Link href="/login?next=/dashboard">▤<small>Mock Tests</small></Link><Link href="/login?next=/dashboard">▣<small>PYQ</small></Link><Link href="/current-affairs">◷<small>Current Affairs</small></Link><button aria-expanded={open} onClick={()=>setOpen(!open)}>☰<small>More</small></button></nav>
{open&&<div className="newjd-mobile-menu">{more.map(m=><Link key={m[0]} href={m[1]} onClick={()=>setOpen(false)}>{m[0]}</Link>)}</div>}
</div>
}
