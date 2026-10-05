"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signUp() {
    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. If email confirmation is enabled, please check your email."
    );

    setLoading(false);
  }

  async function signIn() {
    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } =
      await supabase().auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function continueAsGuest() {
    setLoading(true);
    setMessage("");

    const { error } =
      await supabase().auth.signInAnonymously();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <>
      <div className="nav">
        JD Exambook
      </div>

      <main className="wrap">
        <div
          className="card"
          style={{
            maxWidth: "520px",
            margin: "40px auto",
          }}
        >
          <h1>Login / Sign Up</h1>

          <p className="muted">
            SSC Stenographer Practice Platform
          </p>

          <label>
            Full Name
          </label>

          <input
            className="input"
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
          />

          <label>
            Email
          </label>

          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <label>
            Password
          </label>

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {message && (
            <p
              style={{
                marginTop: "10px",
                marginBottom: "18px",
              }}
            >
              {message}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <button
              className="btn"
              disabled={loading}
              onClick={signIn}
            >
              {loading
                ? "Please wait..."
                : "Login"}
            </button>

            <button
              className="btn btn2"
              disabled={loading}
              onClick={signUp}
            >
              Create Account
            </button>

            <div
              style={{
                textAlign: "center",
                color: "#667085",
                margin: "5px 0",
              }}
            >
              OR
            </div>

            <button
              className="btn"
              disabled={loading}
              onClick={continueAsGuest}
              style={{
                background: "#1f7a4d",
              }}
            >
              👤 Continue as Guest
            </button>
          </div>

          <p
            className="muted"
            style={{
              marginTop: "20px",
              fontSize: "14px",
            }}
          >
            Guest mode is for quick testing.
            Guest progress may be lost if browser
            data is cleared or the guest session
            is removed.
          </p>
        </div>
      </main>
    </>
  );
}
