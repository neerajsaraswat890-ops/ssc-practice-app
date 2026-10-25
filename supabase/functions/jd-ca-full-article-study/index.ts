import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const dbSignal=()=>AbortSignal.timeout(7000);
const respond=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const norm=(v:string)=>v.normalize("NFKC").toLowerCase().replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
const plain=(raw:string)=>raw
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
  .replace(/<(?:nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:nav|footer|aside)>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"')
  .replace(/&#39;|&#x27;/gi,"'").replace(/\s+/g," ").trim();
const words=(s:string)=>norm(s).split(" ").filter(Boolean);
const stop=new Set(["and","with","from","this","that","under","over","have","their","today","2026","ministry","government","india","indian","release","press","news","national"]);
const titleScore=(title:string,body:string)=>{const t=[...new Set(words(title).filter(x=>x.length>3&&!stop.has(x)))];const bs=new Set(words(body));return t.length?t.filter(x=>bs.has(x)).length/t.length:0;};
const digits=(v:string)=>[...new Set((v.match(/\b\d+(?:\.\d+)?\b/g)||[]).filter(x=>x.length>=2&&!["2025","2026","2027","2028"].includes(x)))];
// Exact, curated first-party news hosts only. Normalise the www. variant; never follow redirects or accept credentials/non-HTTPS URLs.
const officialNewsHosts=new Set(["pib.gov.in","rbi.org.in","who.int","bcci.tv","fisu.net","prokabaddi.com","icc-cricket.com","indiansuperleague.com","inside.fifa.com","nasa.gov","unep.org","worldbank.org"]);
const host=(u:URL,allowed:Set<string>)=>u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&allowed.has(u.hostname.toLowerCase().replace(/^www\./,""));
function posted(s:string){
 const m=s.match(/Posted\s+On\s*:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
 if(!m)return null;
 const mon=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].slice(0,3).toLowerCase());
 return mon<0?null:[m[3],String(mon+1).padStart(2,"0"),m[1].padStart(2,"0")].join("-");
}
function dateOnly(raw:string){
 const iso=raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);if(iso)return iso[1];
 const numeric=raw.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
 if(numeric)return [numeric[3],numeric[2].padStart(2,"0"),numeric[1].padStart(2,"0")].join("-");
 const named=raw.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/i);
 if(!named)return null;
 const month=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(named[2].slice(0,3).toLowerCase());
 return month<0?null:[named[3],String(month+1).padStart(2,"0"),named[1].padStart(2,"0")].join("-");
}
function articlePublicationDate(html:string,text:string){
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  if(!/(article:published_time|datepublished|publish(?:ed)?_time|pubdate|parsely-pub-date)/i.test(tag)&&!(/\bname\s*=\s*["'](?:date|dcterms.date|dc.date)["']/i.test(tag)))continue;
  const value=tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
  if(value){const d=dateOnly(value);if(d)return d;}
 }
 const values=[
  html.match(/<time\b[^>]*\bdatetime\s*=\s*["']([^"']+)["']/i)?.[1]||"",
  html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i)?.[1]||"",
  posted(text)||"",
  text.match(/\b(?:published|posted)\s*(?:on|:)\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})/i)?.[1]||""
 ];
 for(const value of values){const d=dateOnly(value);if(d)return d;}
 return null;
}
const candidates=(s:string,language:"en"|"hi")=> {
 const key=language==="en"?/\b(awards?|launch|launched|appointed|announced|signed|agreement|crore|million|billion|first|approved|scheme|report|rank|inaugurat|commission|medal|percent|fund|education|exercise|scientist|research|bank|reserve|finance|2026)\b/i:/(पुरस्कार|योजना|करोड़|लाख|प्रथम|पहला|आरंभ|शुरू|समझौता|नियुक्त|घोषणा|मंजूरी|खेल|पदक|विकास|प्रौद्योगिकी|आयोग|वित्त|बैंक|प्रतिशत|शिक्षा|अभियान|भारत)/;
 return s.split(language==="en"?/(?<=[.!?])\s+(?=[A-Z0-9])/g:/(?<=[।!?])\s+/g)
  .map(x=>x.trim()).filter(x=>x.length>=55&&x.length<=380&&key.test(x)&&digits(x).length>0)
  .slice(0,120);
};
const rubric=[
 ["Polity & Governance",["parliament","supreme court","high court","constitution","bill","act","judgment","judgement","election commission","election results","assembly election","governance","fundamental right","government order","policy","parliamentary session","amendment"],["SSC","Railway","State"],17],
 ["Banking & Economy",["rbi","reserve bank","repo","banking","bank","interest rate","monetary policy","inflation","sebi","insurance","financial","securities","trade agreement","free trade agreement","fta","investment","budget","gdp","msme","upi","export","import","unemployment","economic survey"],["Banking","SSC","Railway"],20],
 ["Government Schemes",["scheme","yojana","mission","campaign","cabinet","ministry","welfare","initiative","programme","program","beneficiary","subsidy","government project","national policy"],["SSC","Railway","State"],17],
 ["Science & Technology",["technology","space","isro","ai","artificial intelligence","research","satellite","rocket engine","robotic","innovation","drone","quantum","biotechnology","digital","patent","deep sea","semiconductor"],["SSC","Railway","State"],15],
 ["Defence & Security",["navy","army","defence","defense","missile","drdo","military","exercise","commissioned","security","border","defence agreement","defense agreement"],["SSC","Defence","Railway"],16],
 ["Environment & Ecology",["environment","ecology","climate","biodiversity","wildlife","forest","ramsar","wetland","emissions","renewable energy","non-fossil","national park","tiger reserve","conservation","environmental performance index","water positive"],["SSC","Railway","State"],16],
 ["Health & Public Health",["health","who","disease","vaccine","public health","epidemic","medical","nutrition","healthcare","hospital","ncrb"],["SSC","Railway","State"],14],
 ["Agriculture",["agriculture","farmer","crop","minimum support price","msp","fertilizer","irrigation","foodgrain","livestock","fisheries","rabi crop"],["SSC","Railway","State"],14],
 ["Sports",["sports","athlete","games","medal","championship","tournament","gold medal","bronze medal","silver medal","cup","world record","commonwealth games","asian games","para games","world cup"],["SSC","Railway","State"],15],
 ["Appointments & Awards",["appointed","appointment","award","honour","honor","prize","winner","elected","chairperson","nobel","nominated","took charge","selected as","laureate","fields medal"],["SSC","Banking","Railway"],15],
 ["International Relations",["united nations","summit","bilateral","agreement","international","treaty","foreign affairs","g20","brics","wto","cop17","free trade agreement","joint defence agreement","joint defense agreement","memorandum of understanding"],["SSC","Banking","State"],13],
 ["Reports & Rankings",["report","national report","ranking","index","survey","ranked","assessment","scorecard","key findings","performance index","ncrb report","atlas method"],["SSC","Banking","Railway"],14],
 ["Art, Culture & Heritage",["heritage","archaeological","unesco","monument","culture","festival","classical language","intangible","museum","geographical indication","gi tag","book release","book launched"],["SSC","Railway","State"],13],
 ["Geography & Places in News",["river","lake","island","strait","sea","mountain","glacier","corridor","statehood","geographical","wetland complex","place in news"],["SSC","Railway","State"],11],
 ["Personalities & Obituaries",["passed away","passes away","demise","obituary","died","posthumous"],["SSC","Railway","State"],12],
 ["Important Days & Events",["international day","world day","observed on","anniversary","foundation day","independence day"],["SSC","Railway","State"],10]
] as const;
// Exam-prep videos, Chronology Current GK and Pratiyogita Darpan inform topic coverage and question angles only.
// They are not evidence for article facts, publication dates, or attribution; those must come from official first-party pages.
const examReferenceCoverage=[
 ["Utkarsh",["Polity & Governance","Banking & Economy","Government Schemes","Science & Technology","Defence & Security","Sports","Appointments & Awards","International Relations","Art, Culture & Heritage","Geography & Places in News","Important Days & Events"]],
 ["StudyIQ",["Polity & Governance","Banking & Economy","Government Schemes","Science & Technology","Environment & Ecology","Health & Public Health","Agriculture","Appointments & Awards","International Relations","Reports & Rankings","Art, Culture & Heritage","Geography & Places in News"]],
 ["Parcham",["Banking & Economy","Government Schemes","Science & Technology","Sports","Appointments & Awards","International Relations","Geography & Places in News"]],
 ["Testbook/Krati sample",["Banking & Economy","Government Schemes","Science & Technology","Defence & Security","Sports","Appointments & Awards","International Relations","Reports & Rankings","Art, Culture & Heritage","Geography & Places in News","Important Days & Events","Polity & Governance"]],
 ["Chronology Current GK",["Polity & Governance","Banking & Economy","Government Schemes","Science & Technology","Defence & Security","Environment & Ecology","Health & Public Health","Agriculture","Sports","Appointments & Awards","Personalities & Obituaries","International Relations","Reports & Rankings","Art, Culture & Heritage","Geography & Places in News","Important Days & Events"]],
 ["Pratiyogita Darpan",["Polity & Governance","Banking & Economy","Government Schemes","Science & Technology","Defence & Security","Environment & Ecology","Health & Public Health","Agriculture","Sports","Appointments & Awards","Personalities & Obituaries","International Relations","Reports & Rankings","Art, Culture & Heritage","Geography & Places in News","Important Days & Events"]]
] as const;
const hasKeyword=(text:string,key:string)=>(" "+text+" ").includes(" "+norm(key)+" ");
// PD-inspired editorial pattern, drawn from the October 2026 issue's stated focus on
// major national/international events and its representative policy, Parliament, agreements,
// reports, science/energy, environment, awards, and sports coverage. This guides relevance only;
// official first-party articles remain the sole evidence for facts, dates, and attribution.
const pdEditorialPatterns=[
 {label:"Policy, scheme or Parliament action",pattern:/\b(?:parliamentary session|parliament|yojana|scheme|mission|cabinet|policy|bill|act|initiative|national address)\b/,categories:["Polity & Governance","Government Schemes"]},
 {label:"International agreement or strategic cooperation",pattern:/\b(?:memorandum|moa|agreement|treaty|bilateral|multilateral|maritime security|joint defence|defence cooperation)\b/,categories:["International Relations","Defence & Security"]},
 {label:"Official report, ranking or measurable outcome",pattern:/\b(?:report|index|ranking|survey|capacity|gigawatt|gw|record|landmark|target)\b/,categories:["Reports & Rankings","Banking & Economy","Science & Technology"]},
 {label:"Science, space or technology milestone",pattern:/\b(?:rocket|spacecraft|satellite|first|unveils|innovation|technology|e samudra|non fossil)\b/,categories:["Science & Technology"]},
 {label:"Environment or regulatory change",pattern:/\b(?:eco sensitive|western ghats|biodiversity|wetland|climate|protected area|notification)\b/,categories:["Environment & Ecology"]},
 {label:"Award or nationally significant honour",pattern:/\b(?:fields medal|award|prize|honour|medal)\b/,categories:["Appointments & Awards","Personalities & Obituaries"]},
 {label:"Major sports event or result",pattern:/\b(?:commonwealth games|olympic|world cup|championship|medal|tournament)\b/,categories:["Sports"]}
] as const;
function scoreExam(t:string){
 const v=norm(t);
 const hits=rubric.map(([category,keys,tags,weight])=>({category,tags,weight,hits:keys.filter(k=>hasKeyword(v,k)).length})).filter(x=>x.hits>0).sort((a,b)=>b.hits*b.weight-a.hits*a.weight);
 const best=hits[0];
 const categories=hits.map(h=>h.category);
 const pdSignals=pdEditorialPatterns.filter(p=>p.pattern.test(v)&&p.categories.some(c=>categories.includes(c))).map(p=>p.label);
 const pdBoost=Math.min(8,pdSignals.length*2);
 const references=examReferenceCoverage.filter(([,covered])=>covered.some(category=>categories.includes(category))).map(([name])=>name);
 const referenceBoost=references.length>=2?Math.min(6,(references.length-1)*2):0;
 let score=Math.min(95,18+(best?best.weight:0)+Math.min(35,hits.reduce((s,x)=>s+x.hits*5,0))+referenceBoost+pdBoost);
 if(!best)score=12;
 // Keep a single useful exam-current-affairs story when a clear topic signal exists.
 // PD patterns rank likely exam value; they do not replace first-party date, source, or fact checks.
 const eligible=!!best&&score>=33;
 const reasons=hits.slice(0,3).map(h=>h.category+": "+h.hits+" topical indicators");
 if(pdSignals.length)reasons.push("PD editorial pattern: "+pdSignals.slice(0,3).join("; "));
 if(referenceBoost)reasons.push("Exam-prep topic coverage overlap: "+references.join(", "));
 if(!eligible)reasons.push("Filtered: not enough exam-current-affairs indicators");
 return {score,eligible,category:best?.category||"National",tags:best?[...new Set(hits.flatMap(h=>[...h.tags]))]:["SSC"],reasons};
}
async function download(uri:URL,allowed:Set<string>){
 if(!host(uri,allowed))throw Error("untrusted_host");
 const ac=new AbortController(),t=setTimeout(()=>ac.abort(),10000);
 try{
  const res=await fetch(uri,{redirect:"manual",signal:ac.signal,headers:{accept:"text/html","user-agent":"JDExambookExamNewsReader/1.0"}});
  if(!res.ok)throw Error("article_http_"+res.status);
  if(!(res.headers.get("content-type")||"").includes("text/html"))throw Error("article_not_html");
  const size=Number(res.headers.get("content-length")||0);if(size>1750000)throw Error("article_too_large");
  const html=await res.text();if(html.length>1750000)throw Error("article_too_large");
  if(/captcha|access denied|verify you are human/i.test(html.slice(0,1700)))throw Error("article_blocked");
  return {html,text:plain(html)};
 }finally{clearTimeout(t)}
}
function pairFacts(en:string,hi:string){
 const e=candidates(en,"en"),h=candidates(hi,"hi"),pairs:{en:string,hi:string,anchor:string}[]=[];
 const used=new Set<number>();
 for(const x of e){
  if(pairs.length>=5)break;
  const ns=digits(x);if(!ns.length)continue;
  const matches=h.map((y,i)=>({i,y,shared:ns.filter(n=>digits(y).includes(n))})).filter(z=>z.shared.length && !used.has(z.i));
  matches.sort((a,b)=>b.shared.length-a.shared.length);
  if(!matches.length)continue;
  const y=matches[0];const anchor=y.shared[0];
  const enCut=x.length>250?x.slice(0,250).replace(/\s+\S*$/,"")+"…":x;
  const hiCut=y.y.length>250?y.y.slice(0,250).replace(/\s+\S*$/,"")+"…":y.y;
  if(!enCut.includes(anchor)||!hiCut.includes(anchor))continue;
  pairs.push({en:enCut,hi:hiCut,anchor});used.add(y.i);
 }
 return pairs;
}
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,"0")).join("");
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!key)return respond({error:"not_configured"},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:ae}=await db.from("ca_job_auth").select("token").eq("id",1).single().abortSignal(dbSignal());
 if(ae||!auth?.token)return respond({error:"auth_unavailable"},503);
 if(req.headers.get("authorization")!=="Bearer "+auth.token)return respond({error:"unauthorized"},401);
  // Admit only administrator-configured first-party news domains, without wildcard subdomains.
  const allowedHosts=new Set(officialNewsHosts);
  const {data:configured,error:domainError}=await db.from("ca_sources").select("allowed_host").eq("enabled",true).abortSignal(dbSignal());
  if(domainError)return respond({error:"approved_source_domains_unavailable"},503);
  for(const source of configured||[]){
    for(const entry of String(source.allowed_host||"").split(",")){
      const raw=entry.trim().toLowerCase().replace(/^www\./,"").replace(/\.$/,"");
      if(/^(?=.{1,253}$)(?!-)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(raw)&&!raw.endsWith(".local")&&!raw.endsWith(".internal"))allowedHosts.add(raw);
    }
  }
 const bodyParams=await req.json().catch(()=>({}));
 const dryRun=bodyParams?.dry_run===true;
 const reprocessPending=bodyParams?.reprocess_pending===true;
 const requested=Number(bodyParams?.limit);
 const maxItems=Number.isFinite(requested)&&requested>=1?Math.min(18,Math.max(1,Math.trunc(requested))):18;
 const itemSelect="id,canonical_url,headline_en,headline_hi,summary_en,summary_hi,event_date,published_at,status,article_analysis_status,key_facts_en,key_facts_hi";
 let items:any[]=[];
 if(reprocessPending){
  // One-off bounded recheck for pending items analyzed by an older rubric. Never rerun
  // items already logged with this PD rubric version.
  const {data:oldItems,error:oldError}=await db.from("ca_items").select(itemSelect)
   .eq("status","pending").in("article_analysis_status",["not_processed","needs_review","source_error"])
   .order("published_at",{ascending:false}).limit(250).abortSignal(dbSignal());
  if(oldError)return respond({error:"recheck_items_unavailable"},503);
  const ids=(oldItems||[]).map((x:any)=>x.id);
  const {data:currentRuns,error:runError}=ids.length
   ?await db.from("ca_article_analyses").select("item_id").eq("pipeline_version","article_exam_rubric_v3_pd").in("item_id",ids).abortSignal(dbSignal())
   :{data:[],error:null};
  if(runError)return respond({error:"recheck_history_unavailable"},503);
  const already=new Set((currentRuns||[]).map((x:any)=>x.item_id));
  items=(oldItems||[]).filter((x:any)=>!already.has(x.id)).slice(0,maxItems);
 }else{
  const {data:regularItems,error:re}=await db.from("ca_items").select(itemSelect)
   .in("status",["pending","approved"]).eq("article_analysis_status","not_processed")
   .order("published_at",{ascending:false}).limit(maxItems).abortSignal(dbSignal());
  if(re)return respond({error:"read_failed"},503);
  items=regularItems||[];
 }
 const results=[];let enriched=0,autoApproved=0,held=0;
 for(const item of items||[]){
  let state="source_error",issue="",body="",matches:{en:string,hi:string,anchor:string}[]=[],rating=0,examEligible=false,category="National",examTags:string[]=["SSC"],why:string[]=[];
  let evidenceDate:null|string=null, digest:null|string=null, englishFacts:string[]=[];
  try{
   const u=new URL(item.canonical_url);if(!host(u,allowedHosts))throw Error("not_first_party_official");
   const article=await download(u,allowedHosts);body=article.text;
   if(words(body).length<180)throw Error("incomplete_article_body");
   digest=await sha(body);
   const rank=scoreExam(item.headline_en+" "+body.slice(0,4500));
   rating=rank.score;examEligible=rank.eligible;category=rank.category;examTags=rank.tags;why=rank.reasons;
   // Repetitive daily market tables/auction result notices are lower-value for SSC and most banking exams than policy decisions, appointments and landmark schemes.
   if(/^(?:money market operations as on|state government securities - full auction result|result of (?:the )?(?:7-day )?variable rate repo|result of yield\/price based auction)/i.test(item.headline_en)){
     rating=Math.min(29,rating);examEligible=false;why=[...why,"Routine market-table bulletin: low exam value"];
   }
   englishFacts=candidates(body,"en").filter(sentence=>!/skip to main content|press releases \| official website|not pressed change language/i.test(sentence)).slice(0,10);
   const isPIB=u.hostname.endsWith("pib.gov.in");
   let enText="",hiText="";
   if(isPIB){
     const prid=u.searchParams.get("PRID")||u.searchParams.get("prid");
     if(!prid||!/^\d{6,8}$/.test(prid))throw Error("unrecognized_pib_prid");
     const enPage=(u.searchParams.get("lang")==="2")?await download(new URL("https://www.pib.gov.in/PressReleseDetailm.aspx?PRID="+prid+"&lang=1&reg=3"),allowedHosts):article;
     let hiPage=await download(new URL("https://www.pib.gov.in/PressReleseDetailm.aspx?PRID="+prid+"&lang=2&reg=3"),allowedHosts);
     // PIB sometimes serves the Hindi edition at the full release-page URL instead of its mobile detail page.
     if((hiPage.text.match(/[\u0900-\u097F]/g)||[]).length<180){
       try{
         const alternate=await download(new URL("https://www.pib.gov.in/PressReleasePage.aspx?PRID="+prid+"&lang=2&reg=48"),allowedHosts);
         if((alternate.text.match(/[\u0900-\u097F]/g)||[]).length>180)hiPage=alternate;
       }catch{ /* Hindi source remains unavailable; do not invent translations. */ }
     }
     enText=enPage.text;hiText=hiPage.text;
     evidenceDate=posted(enText)||posted(hiText);
   }else{
     if(u.hostname.toLowerCase().replace(/^www\./,"")==="whc.unesco.org")throw Error("source_restricted_pending_syndication_permission");
     // Other sources qualify only when the official article itself supplies both languages and an explicit publication date.
     enText=body;hiText=body;
     evidenceDate=articlePublicationDate(article.html,body);
   }
   if(!evidenceDate||evidenceDate!==item.event_date)throw Error("original_publication_date_disagrees");
   if((hiText.match(/[\u0900-\u097F]/g)||[]).length<180)throw Error("hindi_source_not_available");
   if(titleScore(item.headline_en,enText)<0.64)throw Error("headline_not_in_original");
   matches=pairFacts(enText,hiText);
   if(matches.length<2){state="needs_review";issue="fewer_than_two_bilingual_matched_facts";continue}
   if(!examEligible){state="low_priority";issue="below_exam_relevance_threshold";continue}
   state="bilingual_grounded";
  }catch(e){issue=e instanceof Error?e.message:"article_processing_error";state=body?"needs_review":"source_error";}
  finally{
   if(dryRun){
    results.push({id:item.id,status:state,score:rating,category,tags:examTags,reasons:why,
      facts:matches.slice(0,5),issue:issue||undefined,wouldAutoApprove:state==="bilingual_grounded"});
    if(state==="bilingual_grounded")autoApproved++;else held++;
    continue;
   }
   const payload={
    item_id:item.id,source_url:item.canonical_url,source_host:new URL(item.canonical_url).hostname,
    analyzed_at:new Date().toISOString(),article_publication_date:evidenceDate,full_article_words:words(body).length,
    article_sha256:digest,analysis_status:state,exam_score:rating,exam_category:category,exam_tags:examTags,
    relevance_reasons:why,candidate_facts_en:matches.length?matches.map(x=>x.en):englishFacts,candidate_facts_hi:matches.map(x=>x.hi),
    matched_fact_pairs:matches,source_excerpt:body.slice(0,700),verification_issue:issue||null,pipeline_version:"article_exam_rubric_v3_pd"
   };
   const {error:logErr}=await db.from("ca_article_analyses").upsert(payload,{onConflict:"item_id"}).abortSignal(dbSignal());
   if(logErr){results.push({id:item.id,status:"analysis_log_failed"});continue}
   const more={
     article_analysis_status:state,article_read_at:body?new Date().toISOString():null,
     article_evidence_sha256:digest,
     ...(rating?{exam_priority:Math.min(5,Math.max(1,Math.round(rating/20))),exam_category:category,exam_tags:examTags}:{})
   };
   const {error:markErr}=await db.from("ca_items").update(more).eq("id",item.id).abortSignal(dbSignal());
   if(markErr){results.push({id:item.id,status:"item_update_failed"});continue}
   if(state==="bilingual_grounded"){
    // Never modify previously editor-approved headlines, explanations or facts.
    if(item.status==="pending"){
     const now=new Date().toISOString();
     const {data:verified,error:ve}=await db.from("ca_items").update({
       key_facts_en:matches.map(x=>x.en),key_facts_hi:matches.map(x=>x.hi),
       exam_priority:Math.min(5,Math.max(1,Math.round(rating/20))),exam_category:category,exam_tags:examTags,
       headline_hi:item.headline_hi?.trim()||matches[0].hi,
       summary_hi:item.summary_hi?.trim()||matches[0].hi,
       summary_en:item.summary_en?.trim()||matches[0].en,
       status:"approved",evidence_checked:true,approved_at:now,visible_at:now,
       auto_verified:true,auto_verified_at:now,verification_method:"official-full-bilingual-article-rubric-v1",
       review_notes:("Official article and publication date checked; 2+ bilingual source-matched facts; exam score "+rating+"/100 ("+category+"); "+why.slice(0,3).join("; ")).slice(0,800)
     }).eq("id",item.id).eq("status","pending").select("id").abortSignal(dbSignal());
     if(!ve&&verified?.length){autoApproved++;enriched++}else results.push({id:item.id,status:"approval_failed",reason:ve?.message||"unknown"});
    }else enriched++;
   }else held++;
   results.push({id:item.id,status:state,matched:matches.length,score:rating,issue:issue||undefined});
  }
 }
 if(!dryRun)await db.from("ca_automation_runs").insert({job_name:"jd-ca-full-article-study",status:"success",affected:enriched,completed_at:new Date().toISOString(),details:JSON.stringify({processed:results.length,enriched,autoApproved,held}).slice(0,500)}).abortSignal(dbSignal());
 return respond({ok:true,dryRun,processed:results.length,enriched,autoApproved:dryRun?0:autoApproved,wouldAutoApprove:dryRun?autoApproved:undefined,held,results});
});