
import Link from "next/link";
export const metadata={title:"Current Affairs | JD Exambook",description:"Verified daily current affairs, quizzes and weekly revision for competitive exams."};
export default function CurrentAffairsPage(){
return <main style={{minHeight:"100vh",background:"#f6f9fc",padding:"28px 16px",fontFamily:"Arial,sans-serif",color:"#101820"}}>
<div style={{maxWidth:900,margin:"auto"}}>
<Link href="/" style={{color:"#008f60",textDecoration:"none"}}>← JD Exambook Home</Link>
<section style={{background:"linear-gradient(120deg,#e7f8ee,#e8f0ff)",borderRadius:16,padding:26,marginTop:22}}>
<p style={{color:"#008f60",fontWeight:700}}>JD EXAMBOOK • CURRENT AFFAIRS</p>
<h1 style={{fontSize:"clamp(27px,5vw,40px)",margin:"12px 0"}}>Daily Current Affairs</h1>
<p style={{color:"#526176",lineHeight:1.6}}>Source-verified updates and exam-oriented practice, with Hindi and English coverage.</p>
</section>
<section style={{background:"white",border:"1px solid #e4e9ef",padding:24,borderRadius:14,marginTop:22}}>
<h2>Latest Updates</h2><p>Only verified, approved updates will be published here. No verified entries are published yet in this Testing preview.</p>
<p style={{fontSize:13,color:"#64748b"}}>Each upcoming item will show its source, event date, publication date and exam relevance.</p>
</section>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:18,marginTop:20}}>
<section id="daily-quiz" style={{background:"white",padding:23,borderRadius:14,border:"1px solid #e4e9ef"}}><h2>✍ Daily Quiz</h2><p>Free for All</p><p style={{color:"#64748b"}}>Quizzes will become available after questions are verified and published.</p></section>
<section id="weekly-test" style={{background:"white",padding:23,borderRadius:14,border:"1px solid #e4e9ef"}}><h2>🗓 Weekly Test</h2><p>Sunday • 10:00 AM (IST)</p><p style={{color:"#64748b"}}>Weekly revision tests will appear here once approved and scheduled.</p></section>
</div></div></main>
}