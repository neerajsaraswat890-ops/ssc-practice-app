import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
function entities(s:string){return s.replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ").replace(/&#39;|&#x27;/gi,"'");}
function plain(s:string){return entities(s.replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();}
function attributes(tag:string){const out:Record<string,string>={};for(const m of tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))out[m[1].toLowerCase()]=entities(m[2]??m[3]??"");return out;}
function meta(h:string,n:string){for(const m of h.matchAll(/<meta\b[^>]*>/gi)){const a=attributes(m[0]);if((a.name||a.property||a.itemprop||"").toLowerCase()===n.toLowerCase())return a.content||"";}return "";}
function safe(href:string,domain:string){const u=new URL(href),strip=(s:string)=>s.toLowerCase().replace(/^www\./,"");return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&strip(u.hostname)===strip(domain);}
async function fetchText(url:string,domain:string,accept="text/html"){let dest=new URL(url);for(let i=0;i<4;i++){if(!safe(dest.href,domain))throw Error("unsafe_host");const c=new AbortController(),timer=setTimeout(()=>c.abort(),9000);try{const r=await fetch(dest.href,{redirect:"manual",signal:c.signal,headers:{accept,"user-agent":"JD-Exambook-Testing-Official-News/2.0"}});if(r.status>=300&&r.status<400){const l=r.headers.get("location");if(!l)throw Error("redirect_no_location");dest=new URL(l,dest);continue;}if(!r.ok)throw Error("http_"+r.status);return {url:dest.href,content:(await r.text()).slice(0,1200000)};}finally{clearTimeout(timer);}}throw Error("excess_redirects");}
function pibDate(h:string){const text=plain(h).slice(0,200000);const m=text.match(/(?:Posted\s+On|प्रविष्टि\s+तिथि)\s*:?\s*(\d{1,2}\s+[A-Z]{3,9}\s+20\d{2})(?:\s+(\d{1,2}:\d{2})\s*(AM|PM))?/i);if(!m)return NaN;const iso=m[1]+" "+(m[2]||"12:00")+" "+(m[3]||"PM")+" GMT+0530";return Date.parse(iso);}
function headline(h:string){return plain(meta(h,"og:title")||meta(h,"twitter:title")||h.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").slice(0,500);}
function summary(h:string){const m=meta(h,"og:description")||meta(h,"description");if(plain(m).length>=50)return plain(m).slice(0,1200);const posted=h.search(/Posted\s+On|प्रविष्टि\s+तिथि/i);const s=posted>=0?h.slice(posted,posted+50000):h;for(const p of s.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){const t=plain(p[1]);if(t.length>=80&&!/cookie policy|privacy policy|javascript/i.test(t))return t.slice(0,1200);}return "";}
function whoDate(h:string,url:string){for(const n of ["article:published_time","datePublished","date","dc.date.issued"]){const v=meta(h,n),t=Date.parse(v);if(Number.isFinite(t))return t;}const script=h.match(/"datePublished"\s*:\s*"([^"]+)"/i);if(script&&Number.isFinite(Date.parse(script[1])))return Date.parse(script[1]);for(const tag of h.matchAll(/<time\b[^>]*>/gi)){const t=Date.parse(attributes(tag[0]).datetime||"");if(Number.isFinite(t))return t;}const u=new URL(url);const m=u.pathname.match(/\/news\/item\/(\d{2})-(\d{2})-(20\d{2})-/);if(m){const text=plain(h).slice(0,120000);const re=new RegExp(m[1]+"\\s+[A-Za-z]+\\s+"+m[3],"i");if(re.test(text))return Date.UTC(Number(m[3]),Number(m[2])-1,Number(m[1]),12);}return NaN;}
function validDate(t:number){const now=Date.now();return !Number.isFinite(t)?"missing_or_invalid_date":t>now+3600000?"future_date":t<now-8*86400000?"older_than_8_days":null;}
type Found={source:string;examined:number;eligible:number;staged:number;rejected:Record<string,number>;error?:string};
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const base=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!base||!key)return reply({error:"not_configured"},503);
 const db=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth}=await db.from("ca_job_auth").select("token").eq("id",1).single();if(!auth?.token||req.headers.get("authorization")!=="Bearer "+auth.token)return reply({error:"unauthorized"},401);
 const body=await req.json().catch(()=>({})) as {dryRun?:boolean;maxItems?:number;sourceKeys?:string[]};const dryRun=body.dryRun!==false,limit=Math.min(6,Math.max(1,Math.floor(Number(body.maxItems)||3)));
 const keys=["PIB","PIB_HI","WHO"].filter(k=>!Array.isArray(body.sourceKeys)||body.sourceKeys.includes(k));
 const {data:sources,error}=await db.from("ca_sources").select("source_key,feed_url,allowed_host").in("source_key",keys);if(error)return reply({error:"sources_unavailable"},500);
 const started_at=new Date().toISOString(),result:Found[]=[];
 for(const s of sources||[]){const out:Found={source:s.source_key,examined:0,eligible:0,staged:0,rejected:{}};const reject=(name:string)=>out.rejected[name]=(out.rejected[name]||0)+1;
  try{let candidates:{title:string;url:string}[]=[];
   if(s.source_key==="WHO"){const list=await fetchText("https://www.who.int/news-room/releases/1",s.allowed_host);const seen=new Set<string>();
    for(const m of list.content.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*\/news\/item\/[^"']+)["'][^>]*>/gi)){try{const u=new URL(entities(m[1]),list.url);if(safe(u.href,s.allowed_host)&&!seen.has(u.href)){seen.add(u.href);candidates.push({title:"",url:u.href});}}catch{}if(candidates.length>=20)break;}
   }else{const feed=await fetchText(s.feed_url,s.allowed_host,"application/rss+xml,application/xml,text/xml");
    for(const m of feed.content.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){const title=plain(m[1].match(/<title>([\s\S]*?)<\/title>/i)?.[1]||""),href=plain(m[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1]||"");
     try{const u=new URL(href);if(!safe(u.href,s.allowed_host)||!u.searchParams.get("PRID"))continue;u.pathname="/PressReleasePage.aspx";candidates.push({title,url:u.href});}catch{}if(candidates.length>=20)break;}
   }
   if(!candidates.length)reject("no_links_in_official_listing");
   for(const item of candidates.slice(0,limit)){out.examined++;try{const article=await fetchText(item.url,s.allowed_host);const h=article.content;
    const name=(item.title||headline(h)).slice(0,500),description=summary(h),when=s.source_key==="WHO"?whoDate(h,article.url):pibDate(h);
    const reason=name.length<15?"short_headline":description.length<30?"short_description":validDate(when);
    if(reason){reject(reason);continue;}out.eligible++;
    if(!dryRun){const {error:upsertError}=await db.from("ca_web_adapter_candidates").upsert({source_key:s.source_key,article_url:article.url,headline:name,published_at:new Date(when).toISOString(),description,status:"needs_review"},{onConflict:"article_url",ignoreDuplicates:true});if(upsertError){reject("db_error");continue;}out.staged++;}
   }catch(e){const message=String(e instanceof Error?e.message:e);reject(/^http_\d+$/.test(message)?message:/abort|timeout/i.test(message)?"fetch_timeout":"article_fetch_error");}}
  }catch(e){out.error=String(e instanceof Error?e.message:e).slice(0,100);}
  result.push(out);
 }
 const staged=result.reduce((a,x)=>a+x.staged,0);
 await db.from("ca_adapter_diagnostic_runs").insert({started_at,completed_at:new Date().toISOString(),dry_run:dryRun,checked_sources:result.length,staged,report:result});
 return reply({testingOnly:true,dryRun,staged,autoPublished:0,report:result});
});