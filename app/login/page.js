"use client";
import {useState} from "react"; import {supabase} from "../../lib/supabase"; import {useRouter} from "next/navigation";
export default function Login(){const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [msg,setMsg]=useState("");const r=useRouter();
async function signUp(){const {error}=await supabase().auth.signUp({email,password});setMsg(error?error.message:"Account created. Check email if confirmation is enabled.");}
async function login(){const {error}=await supabase().auth.signInWithPassword({email,password});if(error)setMsg(error.message);else r.push("/dashboard");}
return <><div className="nav">SSC Practice</div><main className="wrap"><div className="card" style={{maxWidth:460,margin:"40px auto"}}><h2>Student Login</h2><input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><div className="top"><button className="btn" onClick={login}>Login</button><button className="btn btn2" onClick={signUp}>Create account</button></div><p>{msg}</p></div></main></>}
