import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const dbSignal=()=>AbortSignal.timeout(7000);
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
function clean(v:string){return v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/\s+/g," ").trim();}
function tag(s:string,t:string){let m=s.match(new RegExp("<"+t+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+t+">","i"));return m?clean(m[1]):"";}
function itemsOf(s:string){return [...s.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map(m=>m[1]).slice(0,70);}
function isAllowed(url:string,host:string){try{const u=new URL(url),bare=(v:string)=>v.toLowerCase().replace(/^www\./,"");return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&bare(u.hostname)===bare(host)}catch{return false}}
function istDay(date:Date){const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date).map(x=>[x.type,x.value]));return parts.year+"-"+parts.month+"-"+parts.day;}
function pibId(url:string){try{const u=new URL(url);const p=u.searchParams.get("PRID")||u.searchParams.get("prid");return p&&/^\d{6,8}$/.test(p)?p:null;}catch{return null;}}
Deno.serve(async(request:Request)=>{
 if(request.method!=="POST")return json({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return json({error:"not_configured"},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.from("ca_job_auth").select("token").eq("id",1).single().abortSignal(dbSignal());
 if(authError||!auth?.token)return json({error:"scheduler_auth_unavailable"},503);
 if(request.headers.get("authorization")!=="Bearer "+auth.token)return json({error:"unauthorized"},401);
 const {data:sources,error:sourceError}=await db.from("ca_sources").select("id,source_key,source_name,feed_url,allowed_host,enabled,max_items,category").eq("enabled",true).or("integration_type.is.null,integration_type.neq.web_adapter").abortSignal(dbSignal());
 if(sourceError)return json({error:"source_query_failed"},503);
 const {data:run,error:runError}=await db.from("ca_ingestion_runs").insert({source:"Multiple official feeds",status:"running"}).select("id").single().abortSignal(dbSignal());
 if(runError)return json({error:"run_log_failed"},500);
 let totalFetched=0,totalInserted=0;const outcomes=[];
 for(const source of sources||[]){
 const {data:sr}=await db.from("ca_source_runs").insert({source_id:source.id,ingestion_run_id:run.id,status:"running"}).select("id").single().abortSignal(dbSignal());
 try{
 const c=new AbortController();const timeout=setTimeout(()=>c.abort(),15000);
 let feedText="";
 try{const response=await fetch(source.feed_url,{signal:c.signal,headers:{"Accept":"application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.2","User-Agent":"JD-Exambook-Current-Affairs/1.0"}});
 if(!response.ok)throw new Error("HTTP "+response.status);
 feedText=await response.text();}finally{clearTimeout(timeout)}
 const nodes=itemsOf(feedText);if(nodes.length===0)throw new Error("No RSS/Atom entries; source format or access changed");
 let fetched=0,inserted=0;
 const rejected:Record<string,number>={};
 const skip=(reason:string)=>{rejected[reason]=(rejected[reason]||0)+1;};
 // PIB RSS lists titles and links but omits item-level dates. Reuse dates
 // extracted independently from the official PIB page, keyed by release ID.
 const pibMatches=new Map<string,{published_at:string;article_url:string;description:string}>();
 if(source.source_key==="PIB"||source.source_key==="PIB_HI"){
   const {data:dated,error:dateError}=await db.from("ca_web_adapter_candidates")
     .select("article_url,published_at,description").eq("source_key",source.source_key)
     .gte("published_at",new Date(Date.now()-8*86400000).toISOString()).limit(100).abortSignal(dbSignal());
   if(dateError)throw Error("PIB date lookup failed");
   for(const row of dated||[]){const pid=pibId(row.article_url);if(pid)pibMatches.set(pid,row);}
 }
 for(const item of nodes.slice(0,source.max_items)){
 const headline=tag(item,"title");let href=tag(item,"link");
 if(!href){const lm=item.match(/<link\s+[^>]*href=["']([^"']+)["']/i);if(lm)href=lm[1];}
 let published=tag(item,"pubDate")||tag(item,"published")||tag(item,"updated");
 const corroborated=pibMatches.get(pibId(href)||"");
 // Never invent a publication date; absent a corroborated PIB page, hold item.
 if(!published&&corroborated){published=corroborated.published_at;href=corroborated.article_url;}
 if(!headline){skip("missing_headline");continue;}
 if(!href){skip("missing_link");continue;}
 if(!published){skip("missing_date_no_official_corroboration");continue;}
 if(!isAllowed(href,source.allowed_host)){skip("untrusted_or_non_https_url");continue;}
 const when=new Date(published),now=Date.now();
 if(!Number.isFinite(when.getTime())){skip("invalid_date");continue;}
 if(when.getTime()>now+3600000){skip("future_date");continue;}
 if(when.getTime()<now-8*86400000){skip("older_than_8_days");continue;}
 fetched++;
 // Pair official Hindi RSS items with the matching English PIB release ID.
 // Never publish a Hindi item independently and never overwrite an approved story.
 if(source.source_key==="PIB_HI"){
   const pid=new URL(href).searchParams.get("PRID")||new URL(href).searchParams.get("prid");
   const hindiSummary=(tag(item,"description")||tag(item,"summary")||corroborated?.description||"").slice(0,1200);
   if(pid&&/^\d{6,8}$/.test(pid)&&/[\u0900-\u097f]/.test(headline)&&hindiSummary.length>30){
     const {data:pair, error:pairErr}=await db.from("ca_items").select("id")
       .ilike("canonical_url","%PRID="+pid+"%").eq("status","pending").limit(1).abortSignal(dbSignal());
     if(!pairErr&&pair?.length){
       const {error:updateErr}=await db.from("ca_items").update({
         headline_hi:headline.slice(0,500),summary_hi:hindiSummary
       }).eq("id",pair[0].id).eq("status","pending").abortSignal(dbSignal());
       if(!updateErr)inserted++;
     }
   }
   continue;
 }
 const {data,error}=await db.from("ca_items").upsert({canonical_url:new URL(href).href,source_id:source.id,source_name:source.source_name,headline_en:headline.slice(0,500),summary_en:(tag(item,"description")||tag(item,"summary")||corroborated?.description||"").slice(0,1500),published_at:when.toISOString(),event_date:istDay(when),topics:[source.category].filter(Boolean),status:"pending",evidence_checked:false,approved_at:null},{onConflict:"canonical_url",ignoreDuplicates:true}).select("id").abortSignal(dbSignal());
 if(error)throw new Error("DB "+error.message);
 inserted+=(data||[]).length;
 }
 await db.from("ca_source_runs").update({status:"completed",finished_at:new Date().toISOString(),fetched,inserted}).eq("id",sr?.id).abortSignal(dbSignal());
 totalFetched+=fetched;totalInserted+=inserted;outcomes.push({source:source.source_key,status:"completed",feedNodes:nodes.length,examined:Math.min(nodes.length,source.max_items),fetched,inserted,rejected});
 }catch(e){
 const message=e instanceof Error?e.message:"unknown";
 if(sr?.id)await db.from("ca_source_runs").update({status:"error",finished_at:new Date().toISOString(),error_message:message.slice(0,300)}).eq("id",sr.id).abortSignal(dbSignal());
 outcomes.push({source:source.source_key,status:"error",reason:message.slice(0,120)});
 }
 }
 const allFailed=outcomes.length===0||outcomes.every(x=>x.status==="error");
 await db.from("ca_ingestion_runs").update({status:allFailed?"error":"completed",finished_at:new Date().toISOString(),fetched:totalFetched,inserted:totalInserted,error_message:allFailed?"All configured RSS sources failed":null}).eq("id",run.id).abortSignal(dbSignal());
 return json({ok:!allFailed,fetched:totalFetched,staged:totalInserted,autoPublished:0,sources:outcomes},allFailed?502:200);
});