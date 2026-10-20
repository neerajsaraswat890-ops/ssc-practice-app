"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ReferralPage() {
 const router=useRouter();
 const [status,setStatus]=useState(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{
  const client=supabase();
  const {data:userData}=await client.auth.getUser();
  if(!active)return;
  if(!userData?.user){router.replace("/login?next=/referrals");return;}
  const {data,error:rpcError}=await client.rpc("get_my_referral_status");
  if(!active)return;
  if(rpcError)setError(rpcError.message);
  else setStatus(data);
  setLoading(false);
 })();return()=>{active=false;};},[router]);
 const link=status?.code?("https://www.jdexambook.in/login?ref="+encodeURIComponent(status.code)):"";
 async function copy(){try{await navigator.clipboard.writeText(link);}catch{setError("Copy unavailable. Please copy the link manually.");}}
 return <main className="wrap" style={{maxWidth:760,margin:"40px auto",padding:16}}>
  <h1>JD Exambook — Refer & Earn</h1>
  <p>10 verified registrations पर 30 दिनों का Premium सिर्फ ₹1 में। Regular price ₹199/30 days.</p>
  {loading?<p>Loading your referrals...</p>:error?<p role="alert">{error}</p>:status?<div className="card" style={{padding:24}}>
   <h2>{status.verified_referrals} / 10 Verified Referrals</h2>
   <progress value={Math.min(status.verified_referrals,10)} max={10} style={{width:"100%",height:18}}/>
   <p>Referral code: <strong>{status.code||"Pending"}</strong></p>
   {link&&<><p style={{overflowWrap:"anywhere"}}>{link}</p><button type="button" className="btn" onClick={copy}>Copy Referral Link</button></>}
   <p>{status.reward_claimed?"Your one-time referral reward has been claimed.":status.reward_eligible?"₹1 reward unlocked. Secure checkout will be available after payment integration.":`Only ${Math.max(0,10-status.verified_referrals)} more verified registrations to unlock ₹1 Premium.`}</p>
   <p style={{fontSize:13}}>Only new verified accounts count. No self-referrals. One ₹1 reward per student. Payment must be verified before premium activation.</p>
  </div>:null}
  <p><a href="/dashboard">← Back to Dashboard</a></p>
 </main>;
}
