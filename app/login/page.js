
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  function destinationAfterLogin() {
    const candidate = new URLSearchParams(window.location.search).get("next");
    return candidate && /^\/(?:test|instructions)\/\d+$/.test(candidate)
      ? candidate
      : "/dashboard";
  }

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [awaitingEmailOtp, setAwaitingEmailOtp] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setAwaitingEmailOtp(false);
    setEmailOtp("");
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
      router.replace(destinationAfterLogin());
      return;
    }

    setAwaitingEmailOtp(true);
    setEmailOtp("");
    setMessage("We sent a verification code to your email. Enter the code to confirm your account.");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  async function verifySignUpOtp(e) {
    e.preventDefault();
    const token = emailOtp.trim();
    if (!/^[0-9]{6,8}$/.test(token)) {
      setMessage("Enter the 6–8 digit code from your email.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { data, error } = await supabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setAwaitingEmailOtp(false);
    setEmailOtp("");
    if (data?.session) {
      router.replace(destinationAfterLogin());
      return;
    }
    setMode("login");
    setMessage("Email verified. You can now log in with your email and password.");
    setLoading(false);
  }

  async function resendSignUpOtp() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase().auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    setMessage(error ? error.message : "A new verification code has been sent to your email.");
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

    router.replace(destinationAfterLogin());
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
              {awaitingEmailOtp ? "Verify Your Email" : mode === "login" ? "Login to JD Exambook" : "Create Your Account"}
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
              disabled={awaitingEmailOtp || loading}
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
              disabled={awaitingEmailOtp || loading}
              onClick={() => changeMode("signup")}
              style={{
                opacity: mode === "signup" ? 1 : 0.6,
              }}
            >
              Sign Up
            </button>
          </div>

          <form
            onSubmit={awaitingEmailOtp ? verifySignUpOtp : mode === "login" ? signIn : signUp}
          >
            {awaitingEmailOtp ? (
              <>
                <p className="muted" style={{ lineHeight: 1.5 }}>
                  Enter the verification code sent to <strong>{email}</strong>.
                </p>
                <label style={labelStyle}>Email verification code *</label>
                <input
                  className="input"
                  style={inputStyle}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="Enter 6–8 digit code"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  required
                />
                {message && (
                  <p role="status" style={{ margin: "10px 0 18px", color: "#334155", lineHeight: 1.5 }}>
                    {message}
                  </p>
                )}
              </>
            ) : (
              <>
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
                : awaitingEmailOtp
                ? "Verify Email"
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
              </>
            )}
          </form>
          {awaitingEmailOtp && (
            <button
              type="button"
              disabled={loading}
              onClick={resendSignUpOtp}
              style={{ display: "block", margin: "14px auto", background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
            >
              Resend verification code
            </button>
          )}

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
