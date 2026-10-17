
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState("");
  const [targetExam, setTargetExam] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function signUp(e) {
    e.preventDefault();

    if (
      !fullName.trim() ||
      !email.trim() ||
      !mobile.trim() ||
      !state ||
      !targetExam ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          mobile_number: mobile.trim(),
          state,
          target_exam: targetExam,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.replace("/dashboard");
      return;
    }

    setMessage(
      "Account created! Please check your email and verify your account before logging in."
    );
    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  async function signIn(e) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage("Please enter your email address first.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/login`,
      }
    );

    setMessage(
      error
        ? error.message
        : "If this email is registered, a password reset link will be sent. Please check your inbox."
    );

    setLoading(false);
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    marginBottom: "12px",
  };

  const labelStyle = {
    display: "block",
    fontWeight: 600,
    marginBottom: "6px",
    fontSize: "14px",
  };

  return (
    <>
      <div
        className="nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Image
          src="/jd-exambook-logo.png"
          alt="JD Exambook Logo"
          width={44}
          height={44}
          priority
          style={{ objectFit: "contain" }}
        />

        <span style={{ fontWeight: 700, fontSize: "20px" }}>
          JD Exambook
        </span>
      </div>

      <main className="wrap">
        <div
          className="card"
          style={{
            maxWidth: "520px",
            margin: "40px auto",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <Image
              src="/jd-exambook-logo.png"
              alt="JD Exambook Logo"
              width={140}
              height={140}
              priority
              style={{
                objectFit: "contain",
                margin: "0 auto",
              }}
            />

            <h1 style={{ margin: "10px 0 6px" }}>
              {mode === "login"
                ? "Login to JD Exambook"
                : "Create Your Account"}
            </h1>

            <p className="muted">
              Competitive Exam Practice Platform
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "22px",
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => changeMode("login")}
              style={{
                opacity: mode === "login" ? 1 : 0.6,
              }}
            >
              Login
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => changeMode("signup")}
              style={{
                opacity: mode === "signup" ? 1 : 0.6,
              }}
            >
              Sign Up
            </button>
          </div>

          <form
            onSubmit={mode === "login" ? signIn : signUp}
          >
            {mode === "signup" && (
              <>
                <label style={labelStyle}>
                  Full Name *
                </label>
                <input
                  className="input"
                  style={inputStyle}
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  required
                />

                <label style={labelStyle}>
                  Mobile Number *
                </label>
                <input
                  className="input"
                  style={inputStyle}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  required
                />

                <label style={labelStyle}>
                  State *
                </label>
                <select
                  className="input"
                  style={inputStyle}
                  value={state}
                  onChange={(e) =>
                    setState(e.target.value)
                  }
                  required
                >
                  <option value="">Select State / UT</option>
                  {[
                    "Andhra Pradesh",
                    "Arunachal Pradesh",
                    "Assam",
                    "Bihar",
                    "Chhattisgarh",
                    "Goa",
                    "Gujarat",
                    "Haryana",
                    "Himachal Pradesh",
                    "Jharkhand",
                    "Karnataka",
                    "Kerala",
                    "Madhya Pradesh",
                    "Maharashtra",
                    "Manipur",
                    "Meghalaya",
                    "Mizoram",
                    "Nagaland",
                    "Odisha",
                    "Punjab",
                    "Rajasthan",
                    "Sikkim",
                    "Tamil Nadu",
                    "Telangana",
                    "Tripura",
                    "Uttar Pradesh",
                    "Uttarakhand",
                    "West Bengal",
                    "Andaman and Nicobar Islands",
                    "Chandigarh",
                    "Dadra and Nagar Haveli and Daman and Diu",
                    "Delhi",
                    "Jammu and Kashmir",
                    "Ladakh",
                    "Lakshadweep",
                    "Puducherry",
                  ].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>
                  Preparing For *
                </label>
                <select
                  className="input"
                  style={inputStyle}
                  value={targetExam}
                  onChange={(e) =>
                    setTargetExam(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Select Target Exam
                  </option>
                  <option value="SSC CGL">SSC CGL</option>
                  <option value="SSC CHSL">SSC CHSL</option>
                  <option value="SSC Stenographer">
                    SSC Stenographer
                  </option>
                  <option value="SSC CPO">SSC CPO</option>
                  <option value="SSC GD">SSC GD</option>
                  <option value="SSC MTS">SSC MTS</option>
                  <option value="SSC Selection Post">
                    SSC Selection Post
                  </option>
                  <option value="Railway">Railway</option>
                  <option value="Other">Other</option>
                </select>
              </>
            )}

            <label style={labelStyle}>
              Email Address *
            </label>
            <input
              className="input"
              style={inputStyle}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label style={labelStyle}>
              Password *
            </label>
            <input
              className="input"
              style={inputStyle}
              type="password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              minLength={6}
              placeholder="Enter password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            {mode === "signup" && (
              <>
                <label style={labelStyle}>
                  Confirm Password *
                </label>
                <input
                  className="input"
                  style={inputStyle}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  required
                />
              </>
            )}

            {message && (
              <p
                role="status"
                style={{
                  margin: "10px 0 18px",
                  color: "#334155",
                  lineHeight: 1.5,
                }}
              >
                {message}
              </p>
            )}

            <button
              className="btn"
              type="submit"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              disabled={loading}
              onClick={resetPassword}
              style={{
                display: "block",
                margin: "14px auto",
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Forgot Password?
            </button>
          )}
        </div>
      </main>
    </>
  );
}
