import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

type Source = { source_key:string; feed_url:string; allowed_host:string; category:string; };
type Result = { source:string; found:number; examined:number; eligible:number; staged:number; rejected:Record<string,number>; error?:string; samples?:unknown[]; listings?:unknown[]; };
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
 UNESCO_WHC:/^\/en\/news\/\d+\/?$/i, UNFCCC:/news|press|2026/i, WORLD_BANK:/news|press|2026/i,
};
const seeds:Record<string,string[]>={
 NASA:["/news/"], WORLD_BANK:["/en/news"], IMF:["/en/news","/en/News"], ISRO:["/LatestNews.html"],
 UNEP:["/news-and-stories"], NOBEL:["/news/"], ECI:["/press-releases"], RAMSAR:["/news"],
 UNESCO_WHC:["/en/news/"], UNFCCC:["/news"], AIR_NEWS:["/category/national/","/category/sports/","/category/business/","/category/international/"], MOSPI:["/press-release"], BCCI:["/articles"],
 FISU:["/news/"], AIFF:["/"], PRO_KABADDI:["/news"], AFC:["/en/"],
 AKFI:["/"], KHELO_INDIA:["/"], MIN_SPORTS:["/all-latest-news","/latest-news"],
 FIFA_MEDIA:["/organisation/media/all-media-releases"], ISL:["/news"],
 SEBI:["/sebiweb/home/HomeAction.do?doListing=yes&sid=6&ssid=23"],
 DRDO:["/drdo/documents/press-release","/drdo/what-is-news"],
 AIFF:["/news","/"],
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
 for(const t of h.matchAll(/<time\b[^>]*>([\s\S]*?)<\/time>/gi)){const v=clean(t[1]);if(/(?:20\d{2}|202\d)/.test(v)&&Number.isFinite(Date.parse(v)))return v;}
 const embedded=h.match(/"(?:datePublished|date_published|publishedAt|publicationDate|publishedDate|publishedOn|publishDate)"\s*:\s*"(20\d{2}-\d{2}-\d{2}(?:T[^"]*)?)"/i);
 if(embedded)return embedded[1];
 // For first-party article pages only: the displayed dateline sits immediately after the h1 title.
 // Never use a general date elsewhere in the article: it might be the event date, not publication date.
 if(["AIFF","SEBI","ISRO","APEDA","AKFI","ESA","NOBEL","UNESCO_WHC","IP_INDIA","MIN_SPORTS","AFC","DRDO","IMF"].includes(sourceKey)){
  const h1=h.search(/<h1\b/i);
  if(h1>=0){const header=clean(h.slice(h1,h1+1700)).slice(0,550);
   const found=header.match(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+20\d{2}\b/i);
   if(found)return found[0];
  }
 }
 const m=h.match(/(?:Posted\s+On|Published\s+On)\s*:?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2})(?:\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i);
 if(m)return m[1]+(m[2]?" "+m[2]:"");
 if(sourceKey==="AIR_NEWS"){
  // Akashvani places its article date beside the official "News On AIR" byline, above the story title.
  const byline=clean(h).slice(0,9000).match(/News\s+On\s+AIR\s*\|\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if(byline)return byline[1];
 }
 if(sourceKey==="AIFF"){
  // AIFF displays an unlabelled dateline near the start of the article, without machine-readable date metadata.
  const articleText=clean(h);
  const displayed=articleText.match(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}\b/i);
  if(displayed)return displayed[0];
 }
 if(sourceKey==="ESA"){
  const pageText=clean(h);
  const raw=pageText.match(/\b([0-3]?\d)\/([01]?\d)\/(20\d{2})\b/);
  if(raw){const day=Number(raw[1]),month=Number(raw[2]);if(day>=1&&day<=31&&month>=1&&month<=12)return raw[3]+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");}
 }
 if(sourceKey==="FIFA_MEDIA"){
  const plain=clean(h).slice(0,35000);
  const release=plain.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}),?\s+(\d{1,2}:\d{2})/i);
  if(release)return release[1]+" "+release[2];
 }
 return "";
}
function valid(url:URL,host:string){const bare=(s:string)=>s.toLowerCase().replace(/^www\./,"");return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&bare(url.hostname)===bare(host);}
async function htmlAt(raw:string,host:string){let u=new URL(raw);for(let i=0;i<4;i++){if(!valid(u,host))throw Error("unsafe_host_or_redirect");const c=new AbortController(),timer=setTimeout(()=>c.abort(),8500);
 try{const r=await fetch(u.href,{signal:c.signal,redirect:"manual",headers:{accept:"text/html,application/xhtml+xml","user-agent":"JD-Exambook-CA-Testing/2.0"}});if(r.status>=300&&r.status<400){const dest=r.headers.get("location");if(!dest)throw Error("redirect_missing_location");u=new URL(dest,u);continue;}if(!r.ok)throw Error("http_"+r.status);if(!(r.headers.get("content-type")||"").toLowerCase().includes("html"))throw Error("non_html");const html=(await r.text()).slice(0,1000000);if(/you need to enable javascript to run this app/i.test(html)&&html.length<5000)throw Error("javascript_rendering_required");if(html.length<400)throw Error("empty_upstream_response");return {html,url:u.href};}finally{clearTimeout(timer);}}
 throw Error("too_many_redirects");
}
function discover(h:string,root:URL,host:string,key:string){const found=new Map<string,number>(),pat=routes[key]||/news|press/i;
 for(const m of h.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){const a=attrs(m[1]);if(!a.href||a.href.startsWith("#"))continue;try{const u=new URL(a.href,root);if(!valid(u,host)||u.href===root.href||/\.(?:pdf|docx?|xlsx?|jpe?g|png|zip)$/i.test(u.pathname))continue;const anchor=clean(m[2]);
   if(key==="AIR_NEWS"){
    // Official Akashvani stories have root-level descriptive slugs, not /news/ paths.
    if(!/^\/[a-z0-9][a-z0-9-]{8,}\/?$/i.test(u.pathname)||anchor.length<27||/^(?:news on air|read more|view all)$/i.test(anchor))continue;
   }else if(!pat.test(u.pathname))continue;let score=0;if(/20\d\d\/\d\d|\/20\d\d\//.test(u.pathname))score+=3;if(/news|press|release/i.test(u.pathname))score+=2;if(anchor.length>25)score+=1;if(/2026/.test(u.href))score+=2;found.set(u.href,Math.max(score,found.get(u.href)||0));}catch{}}
 return [...found.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,15);
}
async function assess(source:Source,db:ReturnType<typeof createClient>,dryRun:boolean,maxArticles:number,debug=false):Promise<Result>{
 const out:Result={source:source.source_key,found:0,examined:0,eligible:0,staged:0,rejected:{}};
 const reject=(key:string)=>out.rejected[key]=(out.rejected[key]||0)+1;
 // UNESCO/WHC requires prior syndication authorisation; do not crawl or copy without it.
 if(source.source_key==="UNESCO_WHC"){reject("syndication_authorisation_required");return out;}
 try{
  const root=new URL(source.feed_url);if(!valid(root,source.allowed_host))throw Error("invalid_source_host");
  let links:string[]=[];
  const airBuckets:string[][]=[];
  for(const suffix of [...(seeds[source.source_key]||[]),""]){try{const target=suffix?new URL(suffix,root).href:root.href;const doc=await htmlAt(target,source.allowed_host);
    if(debug){const raws=[...doc.html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
      (out.listings ||= []).push({url:doc.url,bytes:doc.html.length,anchorCount:raws.length,
        possibleNewsUrls:raws.filter(x=>/news|press|2026|article/i.test(x)).slice(0,8),textStart:clean(doc.html).slice(0,220)});}
    const discovered=discover(doc.html,new URL(doc.url),source.allowed_host,source.source_key);
    if(source.source_key==="AIR_NEWS"){airBuckets.push(discovered.slice(0,5));}
    else links=[...new Set([...links,...discovered])];
    if(links.length>=8&&source.source_key!=="AIR_NEWS")break;}catch(e){const reason=e instanceof Error?e.message:"";reject(["javascript_rendering_required","empty_upstream_response","http_403","http_429"].includes(reason)?reason:"listing_fetch_error");}}
  if(source.source_key==="AIR_NEWS"){
   // Round-robin across National, Sports, Business and International to avoid a single-category news feed.
   const longest=Math.max(0,...airBuckets.map(b=>b.length));
   links=[...new Set(Array.from({length:longest},(_,i)=>airBuckets.flatMap(b=>b[i]?[b[i]]:[])).flat())];
  }
  out.found=links.length;
  if(!links.length){reject("no_matching_links");return out;}
  for(const link of links.slice(0,maxArticles)){
   out.examined++;
   try{
    const d=await htmlAt(link,source.allowed_host),structured=ld(d.html);
    let headline=clean(meta(d.html,"og:title")||meta(d.html,"twitter:title")||structured.headline||d.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||d.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").slice(0,500);
    if(source.source_key==="ISRO")headline=headline.replace(/\s+Home\s*\/.*$/i,"").trim();
    let providedDescription=clean(meta(d.html,"og:description")||meta(d.html,"description")||structured.description||"");
    // SEBI's global boilerplate is not an article summary. Hold title-only for primary-document review.
    if(source.source_key==="SEBI"&&/securities and exchange board of india is made for protect the interests/i.test(providedDescription))providedDescription="";
    const excerpt=articleExcerpt(d.html);
    const headlineOnly=providedDescription.length<30&&excerpt.length<30&&["SEBI","APEDA","AKFI"].includes(source.source_key)&&headline.length>=40;
    const description=(providedDescription.length>=30?providedDescription:excerpt.length>=30?excerpt:headlineOnly?headline:"").slice(0,1200);
    const dateText=dateFrom(d.html,structured,source.source_key),date=Date.parse(dateText);
    if(debug){const h=d.html.search(/<h1\b/i),needle=d.html.toLowerCase().indexOf(headline.toLowerCase().slice(0,20));const at=h>=0?h:needle>=0?needle:0;
      (out.samples ||= []).push({url:d.url,title:headline,dateText,descriptionLength:description.length,
        visibleHeader:clean(d.html.slice(at,at+1800)).slice(0,430),datesNearHeader:clean(d.html.slice(at,at+1800)).match(/(?:\d{1,2}\s+\w+\s+20\d{2}|\w+\s+\d{1,2},?\s+20\d{2})/gi)?.slice(0,5)||[]});}
    const now=Date.now();
    const reason=headline.length<15?"short_headline":description.length<30?"short_description":!Number.isFinite(date)?"missing_or_invalid_date":date>now+3600000?"future_date":date<now-8*86400000?"older_than_8_days":null;
    if(reason){reject(reason);continue;}
    out.eligible++;
    if(!dryRun){const {data:stagedRows,error}=await db.from("ca_web_adapter_candidates").upsert({source_key:source.source_key,article_url:d.url,headline,published_at:new Date(date).toISOString(),description,status:"needs_review",review_notes:headlineOnly?"Headline-only preview; open and verify the primary document before editorial approval.":null},{onConflict:"article_url",ignoreDuplicates:true}).select("id");if(error){reject("database_error");continue;}out.staged+=(stagedRows||[]).length;}
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
 const body=await req.json().catch(()=>({})) as {dryRun?:boolean;batch?:number;sourceKeys?:string[];maxArticles?:number;debug?:boolean};
 const dryRun=body.dryRun!==false,batch=Math.min(10,Math.max(0,Math.floor(Number(body.batch)||0))),maxArticles=Math.min(5,Math.max(1,Math.floor(Number(body.maxArticles)||3)));
 const {data,error}=await db.from("ca_sources").select("source_key,feed_url,allowed_host,category").eq("integration_type","web_adapter").order("source_key");
 if(error)return json({error:"source_query_failed"},500);
 const requested=new Set(Array.isArray(body.sourceKeys)?body.sourceKeys.filter(x=>typeof x==="string"):[]);
 const chosen=requested.size?(data||[]).filter(s=>requested.has(s.source_key)).slice(0,5):(data||[]).slice(batch*5,batch*5+5);
 if(!chosen.length)return json({error:"empty_batch"},400);
 const start=new Date().toISOString(),results:Result[]=[];
 for(const s of chosen)results.push(await assess(s,db,dryRun,maxArticles,dryRun&&body.debug===true));
 const staged=results.reduce((a,r)=>a+r.staged,0),eligible=results.reduce((a,r)=>a+r.eligible,0);
 await db.from("ca_adapter_diagnostic_runs").insert({started_at:start,completed_at:new Date().toISOString(),dry_run:dryRun,checked_sources:results.length,staged,report:results});
 return json({testingOnly:true,dryRun,checkedSources:results.length,eligible,staged,autoPublished:0,report:results});
});