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
 const iso=raw.match(/\b(20\d{2}-\d{2}-\d{2})/);if(iso)return iso[1];
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
 ["Polity & Governance",["parliament","supreme court","high court","constitution","bill","act","judgment","judgement","election commission","election results","assembly election","governance","fundamental right","government order","policy","parliamentary session","amendment","election","poll"],["SSC","Railway","State"],17],
 ["Banking & Economy",["rbi","reserve bank","repo","banking","bank","interest rate","monetary policy","inflation","sebi","insurance","financial","securities","trade agreement","free trade agreement","fta","investment","budget","gdp","msme","upi","export","import","unemployment","economic survey"],["Banking","SSC","Railway"],20],
 ["Government Schemes",["scheme","yojana","mission","campaign","cabinet","ministry","welfare","initiative","programme","program","beneficiary","subsidy","government project","national policy"],["SSC","Railway","State"],17],
 ["Science & Technology",["technology","space","isro","ai","artificial intelligence","research","satellite","rocket engine","robotic","innovation","drone","quantum","biotechnology","digital","patent","deep sea","semiconductor","gigawatt","non fossil","capacity"],["SSC","Railway","State"],15],
 ["Defence & Security",["navy","army","defence","defense","missile","drdo","military","exercise","commissioned","security","border","defence agreement","defense agreement"],["SSC","Defence","Railway"],16],
 ["Environment & Ecology",["environment","ecology","climate","biodiversity","wildlife","forest","ramsar","wetland","emissions","renewable energy","non-fossil","national park","tiger reserve","conservation","environmental performance index","water positive","eco sensitive area","esa"],["SSC","Railway","State"],16],
 ["Health & Public Health",["health","who","disease","vaccine","public health","epidemic","medical","nutrition","healthcare","hospital","ncrb","outbreak","infection"],["SSC","Railway","State"],14],
 ["Agriculture",["agriculture","farmer","crop","minimum support price","msp","fertilizer","irrigation","foodgrain","livestock","fisheries","rabi crop"],["SSC","Railway","State"],14],
 ["Sports",["sports","athlete","games","medal","championship","tournament","gold medal","bronze medal","silver medal","cup","world record","commonwealth games","asian games","para games","world cup"],["SSC","Railway","State"],15],
 ["Appointments & Awards",["appointed","appointment","award","honour","honor","prize","winner","elected","chairperson","nobel","nominated","took charge","selected as","laureate","fields medal"],["SSC","Banking","Railway"],15],
 ["International Relations",["united nations","summit","bilateral","agreement","international","treaty","foreign affairs","g20","brics","wto","cop17","free trade agreement","joint defence agreement","joint defense agreement","memorandum of understanding","election","poll","president"],["SSC","Banking","State"],13],
 ["Reports & Rankings",["report","national report","ranking","index","survey","ranked","assessment","scorecard","key findings","performance index","ncrb report","atlas method"],["SSC","Banking","Railway"],14],
 ["Art, Culture & Heritage",["heritage","archaeological","unesco","monument","culture","festival","classical language","intangible","museum","geographical indication","gi tag","book release","book launched"],["SSC","Railway","State"],13],
 ["Geography & Places in News",["river","lake","island","strait","sea","mountain","glacier","corridor","statehood","geographical","wetland complex","place in news"],["SSC","Railway","State"],11],
 ["Personalities & Obituaries",["passed away","passes away","demise","obituary","died","posthumous"],["SSC","Railway","State"],12],
 ["Important Days & Events",["international day","world day","observed on","anniversary","foundation day","independence day"],["SSC","Railway","State"],10]
] as const;
const hasKeyword=(text:string,key:string)=>(" "+text+" ").includes(" "+norm(key)+" ");
const lowValueHeadlinePatterns:RegExp[]=[
 /\b(?:live updates?|live blog|wrap|roundup|round up)\b/,
 /\b(?:schools? closed|classes? suspended|heavy rainfall|heavy rain|rains? continue|weather forecast|traffic advisory)\b/,
 /\b(?:one killed|one dead|killed as|dies as|accident|crash|vehicle plunges|robbery|theft|police investigate)\b/,
 /\b(?:district panchayat|local civic body|city corporation|ward level|municipal ward)\b/,
 /\b(?:challenges facing|profile|obituary|cultural evening|the democratic leftist)\b/,
 /\b(?:weekly statistical supplement|statistical supplement extract|bulletin extract|daily market report|auction result)\b/,
 /\b(?:group [a-h]|east asia wrap|asean wrap|club football)\b/
];
const pdEditorialPatterns=[
 {label:"Policy, scheme, Parliament or major government action",pattern:/\b(?:monsoon session|parliamentary session|parliament|lok sabha|rajya sabha|union cabinet|niti aayog|prime minister|government of india)\b.{0,170}\b(?:launch(?:es|ed)?|introduc(?:es|ed)|announc(?:es|ed)|approv(?:es|ed)|clear(?:s|ed)|pass(?:es|ed)?|inaugurat(?:es|ed)|notifi(?:es|ed)|issu(?:es|ed)|address(?:es|ed)?|establish(?:es|ed)?|sets up|unveil(?:s|ed)?)\b|\b(?:monsoon session|parliamentary session|bill passed|act passed|cabinet approves|scheme launched|yojana launched|national address)\b/,categories:["Polity & Governance","Government Schemes"]},
 {label:"Government scheme or mission",pattern:/\b(?:yojana|scheme|mission)\b.{0,120}\b(?:launch(?:es|ed)?|approv(?:es|ed)|extends?|revis(?:es|ed)|benefit|notifi(?:es|ed)|fund(?:s|ed)?)\b|\b(?:launch(?:es|ed)?|approv(?:es|ed)|notifi(?:es|ed))\b.{0,120}\b(?:yojana|scheme|mission)\b/,categories:["Government Schemes"]},
 {label:"International agreement or strategic cooperation",pattern:/\b(?:india|japan|saudi arabia|turkiye|pakistan|philippines|european union|eu|united nations|sco|g20|brics)\b.{0,180}\b(?:sign(?:s|ed)?|agreement|memorandum|moa|mou|treaty|pact|cooperation|alliance|summit)\b|\b(?:joint defence agreement|joint defense agreement|maritime security cooperation|moa signed)\b/,categories:["International Relations","Defence & Security"]},
 {label:"National or international election result",pattern:/\b(?:general election|presidential election|parliament(?:ary)? poll|poll results?|election results?|wins? (?:the )?election|won (?:the )?election|elected (?:president|prime minister)|clinches? poll victory|forms government|ousts .{0,80}poll)\b/,categories:["Polity & Governance","International Relations"]},
 {label:"Banking, finance or securities regulation",pattern:/\b(?:rbi|reserve bank of india|reserve bank|sebi|pfrda|irdai)\b.{0,180}\b(?:issues?|released|notifies|announces|amends?|introduces|revises|implements?|directions?|guidelines?|regulations?|policy rate|repo rate|capital requirements?|leverage ratio|basel iii)\b|\b(?:policy rate|repo rate|capital requirements?|leverage ratio|basel iii)\b.{0,140}\b(?:rbi|reserve bank|sebi|banks?)\b/,categories:["Banking & Economy"]},
 {label:"Official report, ranking or measurable outcome",pattern:/\b(?:niti aayog|rbi|reserve bank|world bank|imf|un|who|government)\b.{0,120}\b(?:report|index|ranking|survey|assessment|statistics)\b|\b(?:report|index|ranking|survey|assessment)\b.{0,120}\b(?:released|published|launched|finds|ranks|shows|issues)\b/,categories:["Reports & Rankings","Banking & Economy"]},
 {label:"Science, space, technology or energy milestone",pattern:/\b(?:rocket|satellite|spacecraft|space mission|rocket engine|ffsc|e samudra|semiconductor|quantum|artificial intelligence|gigawatt|gw capacity|non fossil|renewable capacity)\b.{0,150}\b(?:first|launch(?:es|ed)?|unveil(?:s|ed)?|achiev(?:es|ed)|cross(?:es|ed)|reach(?:es|ed)|test(?:s|ed)?|engine|capacity|mission|milestone|platform)\b|\b(?:first|launch(?:es|ed)?|unveil(?:s|ed)?|achiev(?:es|ed)|cross(?:es|ed)|reach(?:es|ed))\b.{0,150}\b(?:rocket|satellite|spacecraft|rocket engine|ffsc|gigawatt|non fossil|renewable capacity)\b/,categories:["Science & Technology","Banking & Economy"]},
 {label:"Environmental regulation or major conservation update",pattern:/\b(?:draft notification|notification issued|eco sensitive area|western ghats|ramsar site|wetland|national park|wildlife sanctuary|biodiversity|protected area|environmental index)\b/,categories:["Environment & Ecology"]},
 {label:"Major award or nationally significant honour",pattern:/\b(?:fields medal|nobel prize|booker prize|padma award|bharat ratna|national film award|wins? (?:the )?award|awarded|named laureate|laureate)\b/,categories:["Appointments & Awards"]},
 {label:"Major sports event, title or medal",pattern:/\b(?:commonwealth games|olympic games|asian games|world cup|world championship)\b.{0,130}\b(?:champion|title|medal|record|final|qualif|2026)\b|\b(?:commonwealth games 2026|olympic games 2028)\b/,categories:["Sports"]},
 {label:"Public health alert, outbreak or emerging disease",pattern:/\b(?:who declares|who recommends|outbreak|epidemic|public health advisory|new variant|vaccine|disease in india|infection in india|melioidosis in india)\b/,categories:["Health & Public Health"]}
] as const;
function scoreExam(title:string,lead:string){
 const t=norm(title);
 const v=norm(title+" "+lead.slice(0,1800));
 const lowValue=lowValueHeadlinePatterns.some(p=>p.test(t));
 const hits=rubric.map(([category,keys,tags,weight])=>({category,tags,weight,hits:keys.filter(k=>hasKeyword(v,k)).length})).filter(x=>x.hits>0);
 const pdSignals=pdEditorialPatterns.filter(p=>p.pattern.test(v));
 const pdCategories=new Set<string>(pdSignals.flatMap(p=>[...p.categories]));
 const relevantHits=hits.filter(x=>pdCategories.has(x.category)).sort((a,b)=>b.hits*b.weight-a.hits*a.weight);
 const best=relevantHits[0];
 const score=best?Math.min(95,30+Math.round(best.weight*0.7)+Math.min(24,best.hits*4)+Math.min(16,pdSignals.length*8)):12;
 const eligible=!lowValue&&!!best&&pdSignals.length>0&&score>=48;
 const reasons=relevantHits.slice(0,3).map(h=>h.category+": "+h.hits+" topic matches");
 if(pdSignals.length)reasons.push("Pratiyogita Darpan event pattern: "+pdSignals.slice(0,3).map(p=>p.label).join("; "));
 if(lowValue)reasons.push("Filtered: routine/local/live/feature content");
 if(!pdSignals.length)reasons.push("Filtered: no PD-style exam event signal");
 return {score,eligible,category:best?.category||"National",tags:best?[...new Set(relevantHits.flatMap(h=>[...h.tags]))]:["SSC"],reasons};
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

async function translateToHindi(text:string):Promise<{text:string,provider:string}>{
 const value=text.trim().slice(0,4500);
 if(!value)throw Error("empty_translation_input");
 const azureKey=Deno.env.get("AZURE_TRANSLATOR_KEY")||"";
 const azureRegion=Deno.env.get("AZURE_TRANSLATOR_REGION")||"";
 if(azureKey||azureRegion){
  if(!azureKey||!azureRegion)throw Error("azure_translator_key_and_region_required");
  const endpoint=(Deno.env.get("AZURE_TRANSLATOR_ENDPOINT")||"https://api.cognitive.microsofttranslator.com").replace(/\/+$/,"");
  const response=await fetch(endpoint+"/translate?api-version=3.0&from=en&to=hi",{
   method:"POST",
   headers:{"Ocp-Apim-Subscription-Key":azureKey,"Ocp-Apim-Subscription-Region":azureRegion,"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify([{text:value}]),signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)throw Error("azure_translate_http_"+response.status);
  const data=await response.json();
  const translated=plain(String(data?.[0]?.translations?.[0]?.text||""));
  if((translated.match(/[\\u0900-\\u097F]/g)||[]).length<4)throw Error("azure_translation_not_hindi");
  return {text:translated,provider:"azure-translator"};
 }
 const googleKey=Deno.env.get("GOOGLE_TRANSLATE_API_KEY")||"";
 if(googleKey){
  try{
   const official=await fetch("https://translation.googleapis.com/language/translate/v2?key="+encodeURIComponent(googleKey),{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({q:value,source:"en",target:"hi",format:"text"}),signal:AbortSignal.timeout(9000)
   });
   if(official.ok){
    const json=await official.json();
    const translated=plain(String(json?.data?.translations?.[0]?.translatedText||""));
    if((translated.match(/[\\u0900-\\u097F]/g)||[]).length>=4)return {text:translated,provider:"google-cloud-translate"};
   }
  }catch{ /* Fall back to Google's no-key translate endpoint. */ }
 }
 const params=new URLSearchParams({client:"gtx",sl:"en",tl:"hi",dt:"t",q:value});
 const response=await fetch("https://translate.googleapis.com/translate_a/single?"+params.toString(),{signal:AbortSignal.timeout(9000),headers:{accept:"application/json"}});
 if(!response.ok)throw Error("google_translate_http_"+response.status);
 const data=await response.json();
 const translated=plain(Array.isArray(data?.[0])?data[0].map((part:any)=>String(part?.[0]||"")).join(""):"");
 if((translated.match(/[\\u0900-\\u097F]/g)||[]).length<4)throw Error("google_translation_not_hindi");
 return {text:translated,provider:"google-no-key-fallback"};
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
 const sourceNameFilter=typeof bodyParams?.source_name==="string"?bodyParams.source_name.trim().slice(0,120):"";
 const dryRun=bodyParams?.dry_run===true;
 const reprocessPending=bodyParams?.reprocess_pending!==false; // scheduled calls drain old pending items; pass false for new-only mode
 const requested=Number(bodyParams?.limit);
 const maxItems=Number.isFinite(requested)&&requested>=1?Math.min(30,Math.max(1,Math.trunc(requested))):30;
 const itemSelect="id,source_name,canonical_url,headline_en,headline_hi,summary_en,summary_hi,event_date,published_at,status,article_analysis_status,key_facts_en,key_facts_hi";
 let items:any[]=[];
 if(reprocessPending){
  // One-off bounded recheck for pending items analyzed by an older rubric. Never rerun
  // items already logged with this PD rubric version.
  let oldQuery:any=db.from("ca_items").select(itemSelect)
   .eq("status","pending").in("article_analysis_status",["not_processed","needs_review","source_error"]);
  if(sourceNameFilter)oldQuery=oldQuery.eq("source_name",sourceNameFilter);
  const {data:oldItems,error:oldError}=await oldQuery.order("published_at",{ascending:false}).limit(1000).abortSignal(dbSignal());
  if(oldError)return respond({error:"recheck_items_unavailable"},503);
  const ids=(oldItems||[]).map((x:any)=>x.id);
  const {data:currentRuns,error:runError}=ids.length
   ?await db.from("ca_article_analyses").select("item_id").eq("pipeline_version","article_exam_rubric_v7_pd_gate").in("item_id",ids).abortSignal(dbSignal())
   :{data:[],error:null};
  if(runError)return respond({error:"recheck_history_unavailable"},503);
  const already=new Set((currentRuns||[]).map((x:any)=>x.item_id));
  items=(oldItems||[]).filter((x:any)=>!already.has(x.id)).slice(0,maxItems);
 }else{
  let regularQuery:any=db.from("ca_items").select(itemSelect)
   .in("status",["pending","approved"]).eq("article_analysis_status","not_processed");
  if(sourceNameFilter)regularQuery=regularQuery.eq("source_name",sourceNameFilter);
  const {data:regularItems,error:re}=await regularQuery.order("published_at",{ascending:false}).limit(maxItems).abortSignal(dbSignal());
  if(re)return respond({error:"read_failed"},503);
  items=regularItems||[];
 }
 const results=[];let enriched=0,autoApproved=0,held=0;
 const analysisStartedAt=Date.now();
 const maxRunMs=105_000;
 let timeBudgetReached=false;
 for(const item of items||[]){
  if(Date.now()-analysisStartedAt>=maxRunMs){timeBudgetReached=true;break}
  let state="source_error",issue="",body="",matches:{en:string,hi:string,anchor:string}[]=[],rating=0,examEligible=false,category="National",examTags:string[]=["SSC"],why:string[]=[];
  let evidenceDate:null|string=null, digest:null|string=null, englishFacts:string[]=[];
  let debugPublishedFeedDate:null|string=null,debugStoredEventDate:null|string=null;
  try{
   const u=new URL(item.canonical_url);if(!host(u,allowedHosts))throw Error("not_first_party_official");
   const article=await download(u,allowedHosts);body=article.text;
   if(words(body).length<180)throw Error("incomplete_article_body");
   digest=await sha(body);
   const rank=scoreExam(item.headline_en,body.slice(0,1800));
   rating=rank.score;examEligible=rank.eligible;category=rank.category;examTags=rank.tags;why=rank.reasons;
   // Repetitive daily market tables/auction result notices are lower-value for SSC and most banking exams than policy decisions, appointments and landmark schemes.
   if(/^(?:money market operations as on|state government securities - full auction result|result of (?:the )?(?:7-day )?variable rate repo|result of yield\/price based auction)/i.test(item.headline_en)){
     rating=Math.min(29,rating);examEligible=false;why=[...why,"Routine market-table bulletin: low exam value"];
   }
   englishFacts=candidates(body,"en").filter(sentence=>!/skip to main content|press releases \| official website|not pressed change language/i.test(sentence)).slice(0,10);
   const isPIB=u.hostname.endsWith("pib.gov.in");
   let enText="",hiText="",hindiHeadline="",translationProvider="";
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
   const publishedFeedDate=dateOnly(String(item.published_at??""));
   const storedEventDate=dateOnly(String(item.event_date??""));
   const feedDate=publishedFeedDate||storedEventDate;
   debugPublishedFeedDate=publishedFeedDate;
   debugStoredEventDate=storedEventDate;
   if(!evidenceDate&&feedDate){
     evidenceDate=feedDate;
     why.push(publishedFeedDate?"Publisher RSS publication date used; article page did not expose a date":"Stored event date used as source-feed date; article page did not expose a date");
   }else if(evidenceDate&&feedDate&&feedDate!==evidenceDate){
     why.push("Source article publication date used; RSS timestamp differed");
   }
   if(!evidenceDate)throw Error("source_publication_date_missing");
   if(evidenceDate>new Date().toISOString().slice(0,10))throw Error("future_publication_date");
   if(titleScore(item.headline_en,enText)<0.64)throw Error("headline_not_in_original");
   if((hiText.match(/[\u0900-\u097F]/g)||[]).length<180){
     if(!examEligible){state="low_priority";issue="below_exam_relevance_threshold";continue}
     try{
       const sourceFacts=englishFacts.filter((fact:string)=>digits(fact).length>0).slice(0,5);
       if(!item.headline_hi?.trim()||((item.headline_hi.match(/[\u0900-\u097F]/g)||[]).length<4)){
         const translatedHeadline=await translateToHindi(item.headline_en);hindiHeadline=translatedHeadline.text;translationProvider=translatedHeadline.provider;
       }else hindiHeadline=item.headline_hi.trim();
       for(const en of sourceFacts){
         const translatedFact=await translateToHindi(en);const hi=translatedFact.text;translationProvider=translatedFact.provider;
         const shared=digits(en).filter(n=>digits(hi).includes(n));
         if(!shared.length)continue;
         const enCut=en.length>250?en.slice(0,250).replace(/\s+\S*$/,"")+"…":en;
         const hiCut=hi.length>250?hi.slice(0,250).replace(/\s+\S*$/,"")+"…":hi;
         matches.push({en:enCut,hi:hiCut,anchor:shared[0]});
       }
     }catch(e){
       state="needs_review";issue=e instanceof Error?"google_translation_failed:"+e.message:"google_translation_failed";continue;
     }
     if(matches.length<2){state="needs_review";issue="fewer_than_two_number_grounded_translations";continue}
     state="machine_translated_grounded";
     why.push("English source facts translated to Hindi with "+translationProvider+"; numeric anchors retained and checked");
   }else{
     matches=pairFacts(enText,hiText);
     if(matches.length<2){state="needs_review";issue="fewer_than_two_bilingual_matched_facts";continue}
     if(!examEligible){state="low_priority";issue="below_exam_relevance_threshold";continue}
     hindiHeadline=item.headline_hi?.trim()||null;
     state="bilingual_grounded";
   }
  }catch(e){issue=e instanceof Error?e.message:"article_processing_error";state=body?"needs_review":"source_error";}
  finally{
   if(dryRun){
    results.push({id:item.id,status:state,score:rating,category,tags:examTags,reasons:why,
      facts:matches.slice(0,5),issue:issue||undefined,debugDates:{published_at:item.published_at??null,event_date:item.event_date??null,publishedFeedDate:debugPublishedFeedDate,storedEventDate:debugStoredEventDate},wouldAutoApprove:state==="bilingual_grounded"||state==="trusted_source_grounded"||state==="machine_translated_grounded"});
    if(state==="bilingual_grounded"||state==="trusted_source_grounded"||state==="machine_translated_grounded")autoApproved++;else held++;
    continue;
   }
   const payload={
    item_id:item.id,source_url:item.canonical_url,source_host:new URL(item.canonical_url).hostname,
    analyzed_at:new Date().toISOString(),article_publication_date:evidenceDate,full_article_words:words(body).length,
    article_sha256:digest,analysis_status:state,exam_score:rating,exam_category:category,exam_tags:examTags,
    relevance_reasons:why,candidate_facts_en:matches.length?matches.map(x=>x.en):englishFacts,candidate_facts_hi:matches.map(x=>x.hi),
    matched_fact_pairs:matches,source_excerpt:body.slice(0,700),verification_issue:issue||null,pipeline_version:"article_exam_rubric_v7_pd_gate"
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
   if(state==="bilingual_grounded"||state==="trusted_source_grounded"||state==="machine_translated_grounded"){
    // Never modify previously editor-approved headlines, explanations or facts.
    if(item.status==="pending"){
     const now=new Date().toISOString();
     const {data:verified,error:ve}=await db.from("ca_items").update({
       key_facts_en:matches.length?matches.map(x=>x.en):englishFacts,
       key_facts_hi:matches.map(x=>x.hi),
       exam_priority:Math.min(5,Math.max(1,Math.round(rating/20))),exam_category:category,exam_tags:examTags,
       headline_hi:hindiHeadline||item.headline_hi?.trim()||matches[0]?.hi||null,
       summary_hi:item.summary_hi?.trim()||matches[0]?.hi||null,
       summary_en:item.summary_en?.trim()||matches[0]?.en||englishFacts[0]||item.summary_en||null,
       status:"approved",evidence_checked:true,approved_at:now,visible_at:now,
       auto_verified:true,auto_verified_at:now,
       verification_method:state==="machine_translated_grounded"?translationProvider+"-grounded-article-rubric-v1":state==="trusted_source_grounded"?"trusted-source-article-rubric-v1":"official-full-bilingual-article-rubric-v1",
       review_notes:(state==="machine_translated_grounded"
         ?(String(item.source_name||"Configured source")+" article and publication date checked; "+translationProvider+" Hindi headline and exam facts checked against the English source; exam score "+rating+"/100 ("+category+"); "+why.slice(0,3).join("; "))
         :state==="trusted_source_grounded"
         ?(String(item.source_name||"Trusted configured source")+" article, publication date and headline checked; English original retained; exam score "+rating+"/100 ("+category+"); "+why.slice(0,3).join("; "))
         :("Official article and publication date checked; 2+ bilingual source-matched facts; exam score "+rating+"/100 ("+category+"); "+why.slice(0,3).join("; "))).slice(0,800)
     }).eq("id",item.id).eq("status","pending").select("id").abortSignal(dbSignal());
     if(!ve&&verified?.length){autoApproved++;enriched++}else results.push({id:item.id,status:"approval_failed",reason:ve?.message||"unknown"});
    }else enriched++;
   }else held++;
   results.push({id:item.id,status:state,matched:matches.length,score:rating,issue:issue||undefined});
  }
 }
 if(!dryRun)await db.from("ca_automation_runs").insert({job_name:"jd-ca-full-article-study",status:"success",affected:enriched,completed_at:new Date().toISOString(),details:JSON.stringify({processed:results.length,enriched,autoApproved,held}).slice(0,500)}).abortSignal(dbSignal());
 return respond({ok:true,dryRun,selected:items.length,processed:results.length,timeBudgetReached,enriched,autoApproved:dryRun?0:autoApproved,wouldAutoApprove:dryRun?autoApproved:undefined,held,results});
});