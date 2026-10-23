import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

type Source = { source_key:string; feed_url:string; allowed_host:string; category:string; };
type Result = { source:string; found:number; examined:number; eligible:number; staged:number; rejected:Record<string,number>; error?:string; };
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const routes:Record<string,RegExp>={
 AIR_NEWS:/news|national|international|2026/i, APEDA:/news|press|gi|2026/i, BCCI:/news|article|2026/i,
 AIFF:/\/article\/|\/news\/|2026/i, AFC:/news|2026|press|media/i, AKFI:/notification|championship|results|kabaddi|2026/i,
 FISU:/\/20\d{2}\/\d{2}\/\d{2}\/|news|university|2026/i, PRO_KABADDI:/\/news\/|2026/i,
 FIFA_MEDIA:/media-releases|news|2026/i, ISL:/\/news\/|2026/i,
 KHELO_INDIA:/news|games|university|2026/i, MIN_SPORTS:/news|university|sport|2026/i,
 DRDO:/press|news|2026/i, ECI:/press|news|2026/i, ESA:/news|2026/i, FIFA:/news|2026/i,
 GI_REGISTRY:/gi|journal|registration|2026/i, ICC:/news|2026/i, IMF:/news|press|2026/i,
 INDIA_PORTAL:/news|press|2026/i, IOC:/news|2026/i, IP_INDIA:/gi|journal|news|2026/i,
 ISRO:/news|press|2026/i, MIN_CULTURE:/news|press|2026/i, MOSPI:/press|news|2026/i,
 NASA:/news|article|2026/i, NITI_AAYOG:/news|press|2026/i, NOBEL:/news|prize|2026/i,
 RAMSAR:/news|wetland|2026/i, SEBI:/press|news|2026/i, UNEP:/news|press|2026/i,
 UNESCO_WHC:/news|site|2026/i, UNFCCC:/news|press|2026/i, WORLD_BANK:/news|press|2026/i,
};
const seeds:Record<string,string[]>={
 NASA:["/news/"], WORLD_BANK:["/en/news"], IMF:["/en/News"], ISRO:["/LatestNews.html"],
 UNEP:["/news-and-stories"], NOBEL:["/news/"], ECI:["/press-releases"], RAMSAR:["/news"],
 UNESCO_WHC:["/en/news/"], UNFCCC:["/news"], MOSPI:["/press-release"], BCCI:["/articles"],
 FISU:["/news/"], AIFF:["/"], PRO_KABADDI:["/news"], AFC:["/en/"],
 AKFI:["/"], KHELO_INDIA:["/"], MIN_SPORTS:["/latest-news"],
 FIFA_MEDIA:["/organisation/media/all-media-releases"], ISL:["/news"],
};
function dec(s:string){return s.replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));}
function clean(s:string){return dec(s.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")).replace(/\s+/g," ").trim();}
function attrs(s:string){const o:Record<string,string>={};for(const a of s.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))o[a[1].toLowerCase()]=dec(a[2]??a[3]??a[4]??"");return o;}
function meta(h:string,name:string){for(const m of h.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);if((a.property||a.name||a.itemprop||"").toLowerCase()===name.toLowerCase())return a.content||"";}return "";}
function ld(h:string){const found:{headline?:string;description?:string;datePublished?:string}={};
 for(const m of h.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const obj=JSON.parse(m[1].trim());const visit=(v:unknown,depth:number)=>{if(depth>5||!v||typeof v!=="object")return;if(Array.isArray(v)){for(const w of v)visit(w,depth+1);return;}const a=v as Record<string,unknown>;if(typeof a.datePublished==="string"&&!found.datePublished)found.datePublished=a.datePublished;if(typeof a.headline==="string"&&!found.headline)found.headline=a.headline;if(typeof a.description==="string"&&!found.description)found.description=a.description;for(const k of ["@graph","mainEntity","itemListElement"])if(k in a)visit(a[k],depth+1);};visit(obj,0);}catch{}
 }
 return found;
}
function articleExcerpt(h:string){
 const region=h.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||h.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||"";
 const parts=[...region.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1])).filter(s=>s.length>=45);
 return parts.slice(0,3).join(" ").slice(0,1200);
}
function dateFrom(h:string,data:ReturnType<typeof ld>,sourceKey:string){if(data.datePublished)return data.datePublished;
 for(const n of ["article:published_time","datePublished","pubdate","date","dc.date.issued"]){const s=meta(h,n);if(s)return s;}
 for(const t of h.matchAll(/<time\b[^>]*>/gi)){const a=attrs(t[0]);if(a.datetime)return a.datetime;}
 const m=h.match(/(?:Posted\s+On|Published\s+On)\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})(?:\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
 if(m)return m[1]+(m[2]?" "+m[2]:"");
 if(sourceKey==="FIFA_MEDIA"){
  const plain=clean(h).slice(0,35000);
  const release=plain.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}),?\s+(\d{1,2}:\d{2})/i);
  if(release)return release[1]+" "+release[2];
 }
 return "";
}
function valid(url:URL,host:string){const bare=(s:string)=>s.toLowerCase().replace(/^www\./,"");return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&bare(url.hostname)===bare(host);}
async function htmlAt(raw:string,host:string){let u=new URL(raw);for(let i=0;i<4;i++){if(!valid(u,host))throw Error("unsafe_host_or_redirect");const c=new AbortController(),timer=setTimeout(()=>c.abort(),8500);
 try{const r=await fetch(u.href,{signal:c.signal,redirect:"manual",headers:{accept:"text/html,application/xhtml+xml","user-agent":"JD-Exambook-CA-Testing/2.0"}});if(r.status>=300&&r.status<400){const dest=r.headers.get("location");if(!dest)throw Error("redirect_missing_location");u=new URL(dest,u);continue;}if(!r.ok)throw Error("http_"+r.status);if(!(r.headers.get("content-type")||"").toLowerCase().includes("html"))throw Error("non_html");return {html:(await r.text()).slice(0,1000000),url:u.href};}finally{clearTimeout(timer);}}
 throw Error("too_many_redirects");
}
function discover(h:string,root:URL,host:string,key:string){const found=new Map<string,number>(),pat=routes[key]||/news|press/i;
 for(const m of h.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){const a=attrs(m[1]);if(!a.href||a.href.startsWith("#"))continue;try{const u=new URL(a.href,root);if(!valid(u,host)||u.href===root.href||!pat.test(u.pathname)||/\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)$/i.test(u.pathname))continue;const anchor=clean(m[2]);let score=0;if(/20\d\d\/\d\d|\/20\d\d\//.test(u.pathname))score+=3;if(/news|press|release/i.test(u.pathname))score+=2;if(anchor.length>25)score+=1;if(/2026/.test(u.href))score+=2;found.set(u.href,Math.max(score,found.get(u.href)||0));}catch{}}
 return [...found.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,15);
}
async function assess(source:Source,db:ReturnType<typeof createClient>,dryRun:boolean,maxArticles:number):Promise<Result>{
 const out:Result={source:source.source_key,found:0,examined:0,eligible:0,staged:0,rejected:{}};
 const reject=(key:string)=>out.rejected[key]=(out.rejected[key]||0)+1;
 try{
  const root=new URL(source.feed_url);if(!valid(root,source.allowed_host))throw Error("invalid_source_host");
  let links:string[]=[];
  for(const suffix of [...(seeds[source.source_key]||[]),""]){try{const target=suffix?new URL(suffix,root).href:root.href;const doc=await htmlAt(target,source.allowed_host);links=[...new Set([...links,...discover(doc.html,new URL(doc.url),source.allowed_host,source.source_key)])];if(links.length>=8)break;}catch(e){reject("listing_fetch_error");}}
  out.found=links.length;
  if(!links.length){reject("no_matching_links");return out;}
  for(const link of links.slice(0,maxArticles)){
   out.examined++;
   try{
    const d=await htmlAt(link,source.allowed_host),structured=ld(d.html);
    const headline=clean(meta(d.html,"og:title")||meta(d.html,"twitter:title")||structured.headline||d.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").slice(0,500);
    const providedDescription=clean(meta(d.html,"og:description")||meta(d.html,"description")||structured.description||"");
    const description=(providedDescription.length>=30?providedDescription:articleExcerpt(d.html)).slice(0,1200);
    const dateText=dateFrom(d.html,structured,source.source_key),date=Date.parse(dateText);
    const now=Date.now();
    const reason=headline.length<15?"short_headline":description.length<30?"short_description":!Number.isFinite(date)?"missing_or_invalid_date":date>now+3600000?"future_date":date<now-8*86400000?"older_than_8_days":null;
    if(reason){reject(reason);continue;}
    out.eligible++;
    if(!dryRun){const {data:stagedRows,error}=await db.from("ca_web_adapter_candidates").upsert({source_key:source.source_key,article_url:d.url,headline,published_at:new Date(date).toISOString(),description,status:"needs_review"},{onConflict:"article_url",ignoreDuplicates:true}).select("id");if(error){reject("database_error");continue;}out.staged+=(stagedRows||[]).length;}
   }catch(e){const message=e instanceof Error?e.message:"unknown";const reason=/^http_\d+$/.test(message)?message:/abort|timeout/i.test(message)?"fetch_timeout":message==="unsafe_host_or_redirect"||message==="non_html"||message==="too_many_redirects"?message:"article_fetch_error";reject(reason);}
  }
 }catch(e){out.error=String(e instanceof Error?e.message:e).slice(0,120);}
 return out;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const supa=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!supa||!secret)return json({error:"config_missing"},503);
 const db=createClient(supa,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth}=await db.from("ca_job_auth").select("token").eq("id",1).single();
 if(!auth?.token||req.headers.get("authorization")!=="Bearer "+auth.token)return json({error:"unauthorized"},401);
 const body=await req.json().catch(()=>({})) as {dryRun?:boolean;batch?:number;sourceKeys?:string[];maxArticles?:number};
 const dryRun=body.dryRun!==false,batch=Math.min(10,Math.max(0,Math.floor(Number(body.batch)||0))),maxArticles=Math.min(5,Math.max(1,Math.floor(Number(body.maxArticles)||3)));
 const {data,error}=await db.from("ca_sources").select("source_key,feed_url,allowed_host,category").eq("integration_type","web_adapter").order("source_key");
 if(error)return json({error:"source_query_failed"},500);
 const requested=new Set(Array.isArray(body.sourceKeys)?body.sourceKeys.filter(x=>typeof x==="string"):[]);
 const chosen=requested.size?(data||[]).filter(s=>requested.has(s.source_key)).slice(0,5):(data||[]).slice(batch*5,batch*5+5);
 if(!chosen.length)return json({error:"empty_batch"},400);
 const start=new Date().toISOString(),results:Result[]=[];
 for(const s of chosen)results.push(await assess(s,db,dryRun,maxArticles));
 const staged=results.reduce((a,r)=>a+r.staged,0),eligible=results.reduce((a,r)=>a+r.eligible,0);
 await db.from("ca_adapter_diagnostic_runs").insert({started_at:start,completed_at:new Date().toISOString(),dry_run:dryRun,checked_sources:results.length,staged,report:results});
 return json({testingOnly:true,dryRun,checkedSources:results.length,eligible,staged,autoPublished:0,report:results});
});