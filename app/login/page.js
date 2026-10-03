"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUp() {
    if (!email || !password) {
      setMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMsg("Creating account...");

    try {
      const { data, error } = await supabase().auth.signUp({
        email,
        password,
      });

      if (error) {
        setMsg("Error: " + error.message);
      } else if (data?.session) {
        setMsg("Account created successfully.");
        router.push("/dashboard");
      } else {
        setMsg(
          "Account created. Please check your email for confirmation, then login."
        );
      }
    } catch (error) {
      setMsg("Connection error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    if (!email || !password) {
      setMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMsg("Logging in...");

    try {
      const { error } = await supabase().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg("Error: " + error.message);
      } else {
        setMsg("Login successful.");
        router.push("/dashboard");
      }
    } catch (error) {
      setMsg("Connection error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="nav">SSC Practice</div>

      <main className="wrap">
        <div
          className="card"
          style={{ maxWidth: 460, margin: "40px auto" }}
        >
          <h2>Student Login</h2>

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="top">
            <button
              className="btn"
              onClick={login}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Login"}
            </button>

            <button
              className="btn btn2"
              onClick={signUp}
              disabled={loading}
            >
              Create account
            </button>
          </div>

          {msg && (
            <p style={{ marginTop: 18, fontWeight: 600 }}>
              {msg}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
