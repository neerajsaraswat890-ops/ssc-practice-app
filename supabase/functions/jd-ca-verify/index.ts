import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const dbSignal=()=>AbortSignal.timeout(7000);
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const norm=(s:string)=>s.toLowerCase().replace(/&amp;/g,"&").replace(/&nbsp;/gi," ").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
function textFromHtml(raw:string){
 return raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")
 .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"')
 .replace(/&#39;|&#x27;/gi,"'").replace(/\s+/g," ").trim();
}
function overlap(reference:string,body:string){
 const common=new Set(["the","a","an","and","of","to","in","for","on","as","by","from","with","at","under","over","new","india","indian","government","2026"]);
 const tokens=[...new Set(norm(reference).split(" ").filter(x=>x.length>2&&!common.has(x)))];
 if(tokens.length<3)return 0;
 const bag=new Set(norm(body).split(" "));
 return tokens.filter(x=>bag.has(x)).length/tokens.length;
}
const numTokens=(s:string)=>[...new Set((s.match(/\b\d+(?:\.\d+)?\b/g)||[]).filter(x=>x.length>1))];
function pdate(s:string){
 const match=s.match(/Posted\s+On\s*:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
 if(!match)return "";
 const month=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(match[2].slice(0,3).toLowerCase());
 return month<0?"":match[3]+"-"+String(month+1).padStart(2,"0")+"-"+match[1].padStart(2,"0");
}
const hostOK=(u:URL)=>u.protocol==="https:"&&(u.hostname==="pib.gov.in"||u.hostname==="www.pib.gov.in");
async function readOfficial(u:URL){
 if(!hostOK(u))throw new Error("non-allowlisted-host");
 const c=new AbortController();const t=setTimeout(()=>c.abort(),10000);
 try{
 const r=await fetch(u,{redirect:"manual",signal:c.signal,headers:{"accept":"text/html","user-agent":"JDExambookEducationalVerification/1.0"}});
 if(!r.ok)throw new Error("source-http-"+r.status);
 const kind=r.headers.get("content-type")||"";
 if(!kind.includes("text/html"))throw new Error("not-html");
 const len=Number(r.headers.get("content-length")||"0");if(len>1800000)throw new Error("page-too-large");
 const raw=await r.text();if(raw.length>1800000)throw new Error("page-too-large");
 if(/captcha|human visitor|support ID|enable javascript to view/i.test(raw.slice(0,1600)))throw new Error("source-challenge");
 return textFromHtml(raw);
 }finally{clearTimeout(t);}
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
 const supabaseUrl=Deno.env.get("SUPABASE_URL"), serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!supabaseUrl||!serviceKey)return respond({error:"not_configured"},503);
 const db=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.from("ca_job_auth").select("token").eq("id",1).single().abortSignal(dbSignal());
 if(authError||!auth?.token)return respond({error:"scheduler_auth_unavailable"},503);
 if(req.headers.get("authorization")!=="Bearer "+auth.token)return respond({error:"unauthorized"},401);
 const {data:rows,error:readError}=await db.from("ca_items")
   .select("id,canonical_url,headline_en,headline_hi,summary_en,summary_hi,event_date,published_at,status")
   .eq("status","pending").order("published_at",{ascending:false}).limit(12).abortSignal(dbSignal());
 if(readError)return respond({error:"read_failed"},503);
 let checked=0,approved=0,needsReview=0,errors=0;const failures=[];
 for(const item of rows||[]){
  let reason="",kind="needs_review", excerpt="",score=0;let pageDate="";
  try{
   const url=new URL(item.canonical_url);
   if(!hostOK(url))throw new Error("auto-approval-limited-to-official-PIB");
   const prid=url.searchParams.get("PRID")||url.searchParams.get("prid");
   if(!prid||!(/^\d{6,8}$/).test(prid))throw new Error("invalid-release-identifier");
   const enUrl=new URL("https://www.pib.gov.in/PressReleseDetailm.aspx?PRID="+encodeURIComponent(prid)+"&lang=1&reg=3");
   const en=await readOfficial(enUrl);
   if(en.length<260)throw new Error("insufficient-source-content");
   pageDate=pdate(en);
   if(!pageDate||pageDate!==item.event_date)throw new Error("publication-date-mismatch");
   score=overlap(item.headline_en,en);
   if(score<0.78)throw new Error("headline-not-proven");
   const factNumbers=numTokens(item.summary_en||"");
   if(factNumbers.length>0&&!factNumbers.every(n=>norm(en).includes(n)))throw new Error("numeric-claim-not-proven");
   if(!item.headline_hi||item.headline_hi.trim().length<12||!item.summary_hi||item.summary_hi.trim().length<32||!item.summary_en||item.summary_en.trim().length<38)throw new Error("bilingual-review-required");
   const hiUrl=new URL("https://www.pib.gov.in/PressReleseDetailm.aspx?PRID="+encodeURIComponent(prid)+"&lang=2&reg=3");
   const hi=await readOfficial(hiUrl);
   if((hi.match(/[\u0900-\u097F]/g)||[]).length<80)throw new Error("no-official-hindi-evidence");
   if(overlap(item.headline_hi,hi)<0.46)throw new Error("hindi-headline-not-proven");
   if(!item.summary_hi.match(/[\u0900-\u097F]/))throw new Error("hindi-summary-missing");
   // Do not silently overwrite decisions by an editor or permit duplicate headlines.
   const {data:duplicate,error:dupErr}=await db.from("ca_items").select("id").neq("id",item.id).eq("status","approved").eq("headline_en",item.headline_en).limit(1).abortSignal(dbSignal());
   if(dupErr)throw new Error("duplicate-check-failed");
   if(duplicate?.length)throw new Error("duplicate-approved-article");
   kind="passed";reason="Official PIB English and Hindi release pages, headline, publication date and numerical claims checked";
   excerpt=en.slice(0,500);
   // Store evidence of a pass before setting the public approved flag.
   const {error:passedAuditError}=await db.from("ca_verification_checks").insert({item_id:item.id,outcome:"passed",source_url:item.canonical_url,evidence_date:pageDate||null,headline_match:score,evidence_excerpt:excerpt.slice(0,1000),reason,engine:"PIB-bilingual-primary-source-v2"}).abortSignal(dbSignal());
   if(passedAuditError)throw new Error("audit_log_unavailable");
   const {data:updated,error:updateError}=await db.from("ca_items").update({
       status:"approved",evidence_checked:true,approved_at:new Date().toISOString(),visible_at:new Date().toISOString(),
       auto_verified:true,auto_verified_at:new Date().toISOString(),verification_method:"PIB-bilingual-primary-source-v2",
       review_notes:reason,reviewed_at:new Date().toISOString()
   }).eq("id",item.id).eq("status","pending").select("id").abortSignal(dbSignal());
   if(updateError||!updated?.length)throw new Error("approval-update-failed");
   approved++;
  }catch(e){
   reason=e instanceof Error?e.message:"unknown";
   kind=/source-http|source-challenge|insufficient|page-too-large|not-html/.test(reason)?"error":"needs_review";
   if(kind==="error")errors++;else needsReview++;
   failures.push({id:item.id,reason});
  }
  if(kind!=="passed"){
   const {error:logError}=await db.from("ca_verification_checks").insert({
   item_id:item.id,outcome:kind,source_url:item.canonical_url,evidence_date:pageDate||null,
   headline_match:score,evidence_excerpt:excerpt.slice(0,1000),
   reason,engine:"PIB-bilingual-primary-source-v2"
  }).abortSignal(dbSignal());
  if(logError)failures.push({id:item.id,reason:"audit-log-error"});
  }
  checked++;
 }
 await db.from("ca_automation_runs").insert({job_name:"jd-ca-verify",status:errors>0&&approved===0?"error":"success",
  affected:approved,completed_at:new Date().toISOString(),details:JSON.stringify({checked,approved,needsReview,errors})}).abortSignal(dbSignal());
 return respond({ok:true,checked,autoApproved:approved,needsReview,errors,issues:failures.slice(0,12)});
});