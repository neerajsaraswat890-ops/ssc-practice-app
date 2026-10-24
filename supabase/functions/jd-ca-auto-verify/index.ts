import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const dbSignal=()=>AbortSignal.timeout(7000);
const answer=(o:unknown,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const normalize=(x:string)=>x.normalize("NFKC").toLowerCase().replace(/&(?:nbsp|amp);/g," ").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const words=(x:string)=>new Set(normalize(x).split(" ").filter(w=>w.length>=4 && !["with","from","this","that","under","their","will","have","government","india","press","release"].includes(w)));
const isOfficial=(url:URL)=>url.protocol==="https:" && (url.hostname==="www.pib.gov.in"||url.hostname==="pib.gov.in"||url.hostname==="www.rbi.org.in"||url.hostname==="rbi.org.in");
const short=(v:string)=>v.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
Deno.serve(async(request:Request)=>{
if(request.method!=="POST")return answer({error:"method_not_allowed"},405);
const endpoint=Deno.env.get("SUPABASE_URL")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
if(!endpoint||!secret)return answer({error:"not_configured"},503);
const db=createClient(endpoint,secret,{auth:{autoRefreshToken:false,persistSession:false}});
const {data:cred,error:authErr}=await db.from("ca_job_auth").select("token").eq("id",1).single().abortSignal(dbSignal());
if(authErr||!cred?.token)return answer({error:"auth_unavailable"},503);
if(request.headers.get("authorization")!=="Bearer "+cred.token)return answer({error:"unauthorized"},401);
const {data:items,error:qe}=await db.from("ca_items").select("id,canonical_url,headline_en,summary_en,published_at,event_date,source_name,headline_hi,summary_hi,status").eq("status","pending").order("published_at",{ascending:false}).limit(20).abortSignal(dbSignal());
if(qe)return answer({error:"query_failed"},503);
const checks=[];let approved=0;let reviewed=0;
for(const item of items||[]){
let outcome="needs_review",reason="unverified",pageDate:string|null=null,ratio=0,excerpt="";
try{
const uri=new URL(item.canonical_url);
if(!isOfficial(uri))throw Error("source domain not in strict pilot allowlist");
if(!/\/Press(?:ReleasePage|ReleseDetailm)\.aspx$/i.test(uri.pathname)&&!/rbi\.org\.in$/i.test(uri.hostname))throw Error("non-article URL");
const age=Date.now()-new Date(item.published_at).getTime();
if(!Number.isFinite(age)||age< -3600000||age>8*86400000)throw Error("outside eight day freshness window");
const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9000);
let res:Response;
try{res=await fetch(uri.href,{signal:ctrl.signal,headers:{"accept":"text/html","user-agent":"JDExambook Source Verification Pilot/1.0"},redirect:"error"});}finally{clearTimeout(timeout)}
if(!res.ok)throw Error("source_http_"+res.status);
const mime=res.headers.get("content-type")||"";
if(!mime.includes("text/html"))throw Error("non-html source");
const body=await res.text();if(body.length<500||body.length>1500000)throw Error("source page invalid length");
const bodyText=short(body).slice(0,500000),pageWords=words(bodyText),titleWords=words(item.headline_en);
const matching=[...titleWords].filter(x=>pageWords.has(x)).length;
ratio=matching/Math.max(titleWords.size,1);
if(titleWords.size<4||ratio<0.85)throw Error("headline fails source evidence match");
const eventDay=new Date(item.published_at).toISOString().slice(0,10);
const monthDay=new Date(item.published_at).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
const dayNumber=Number(new Date(item.published_at).toLocaleDateString("en-US",{day:"numeric",timeZone:"Asia/Kolkata"}));
const year=new Date(item.published_at).toLocaleDateString("en-US",{year:"numeric",timeZone:"Asia/Kolkata"});
const monthAbbr=new Date(item.published_at).toLocaleDateString("en-US",{month:"short",timeZone:"Asia/Kolkata"}).toLowerCase();
const monthFull=new Date(item.published_at).toLocaleDateString("en-US",{month:"long",timeZone:"Asia/Kolkata"}).toLowerCase();
const monthPattern="(?:"+monthAbbr+"|"+monthFull+")";
const plain=normalize(bodyText);
const dateMatched= (plain.includes(year) && (
 new RegExp("\\b"+dayNumber+"\\s+"+monthPattern+"\\b","i").test(plain)
 ||new RegExp("\\b"+monthPattern+"\\s+"+dayNumber+"\\b","i").test(plain)
 ||plain.includes(monthDay.toLowerCase())
 ||plain.includes(eventDay)
 ));
if(!dateMatched)throw Error("published day could not be confirmed on source page");
pageDate=eventDay;
if((item.summary_en||"").trim().length<45)throw Error("source text summary too short");
if(!item.headline_hi||!item.summary_hi)throw Error("bilingual_primary_text_required");
if(item.headline_hi && (item.headline_hi.trim().length<8||item.summary_hi.trim().length<25))throw Error("bilingual text insufficient");
const sumTokens=[...words(item.summary_en||"")].filter(t=>t.length>=5);
const sumMatch=sumTokens.filter(t=>pageWords.has(t)).length/Math.max(sumTokens.length,1);
if(sumTokens.length<8||sumMatch<0.55)throw Error("summary not grounded in source page");
outcome="passed";reason="first-party host, title, day, summary and bilingual completeness passed";excerpt=bodyText.slice(0,260);
}catch(e){reason=e instanceof Error?e.message:"verification_error";if(reason.startsWith("source_http_"))outcome="error";}
const {error:auditError}=await db.from("ca_verification_checks").insert({item_id:item.id,outcome,reason,source_url:item.canonical_url,evidence_date:pageDate,headline_match:ratio,evidence_excerpt:excerpt.slice(0,350),engine:"strict-first-party-v3"}).abortSignal(dbSignal());
if(auditError){checks.push({id:item.id,outcome:"error",reason:"verification_audit_unavailable"});reviewed++;continue;}
if(outcome==="passed"){
const {data:upd,error:uerr}=await db.from("ca_items").update({status:"approved",evidence_checked:true,approved_at:new Date().toISOString(),visible_at:new Date().toISOString(),auto_verified:true,auto_verified_at:new Date().toISOString(),verification_method:"strict-first-party-v3",review_notes:reason}).eq("id",item.id).eq("status","pending").select("id").abortSignal(dbSignal());
if(!uerr && upd?.length)approved++;
}else reviewed++;
checks.push({id:item.id,outcome,reason});
}
await db.from("ca_automation_runs").insert({job_name:"ca-firstparty-auto-verify",status:"success",affected:approved,completed_at:new Date().toISOString(),details:JSON.stringify({checked:checks.length,approved,held:reviewed}).slice(0,500)}).abortSignal(dbSignal());
return answer({ok:true,checked:checks.length,approved,held_for_review:reviewed,results:checks});
});