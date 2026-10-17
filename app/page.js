
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "JD Exambook | SSC Exam Preparation & Online Practice",
  description:
    "Prepare for SSC CGL, CHSL, CPO, GD and Stenographer with JD Exambook. Explore exam preparation resources, subject-wise practice and upcoming mock tests.",
  alternates: {
    canonical: "/",
  },
};

const exams = [
  { name: "SSC CGL", code: "SSC_CGL" },
  { name: "SSC CHSL", code: "SSC_CHSL" },
  { name: "SSC CPO", code: "SSC_CPO" },
  { name: "SSC GD", code: "SSC_GD" },
  { name: "SSC Stenographer", code: "SSC_STENO" },
];

const subjects = [
  { name: "Mathematics", symbol: "∑" },
  { name: "Reasoning", symbol: "◇" },
  { name: "GK / GS / GA", symbol: "◎" },
  { name: "English", symbol: "Aa" },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f9fc",
        color: "#101820",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        isolation: "isolate",
      }}
    >
      {/* Background Logo Watermark - 10% Visibility */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <Image
          src="/jd-exambook-logo.png"
          alt=""
          width={650}
          height={650}
          priority
          style={{
            width: "min(75vw, 650px)",
            height: "auto",
            opacity: 0.1,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          background: "#ffffff",
          padding: "14px 6%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          borderBottom: "1px solid #e5eaf0",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#0866c2",
            textDecoration: "none",
            fontSize: "clamp(19px, 3vw, 26px)",
            fontWeight: 800,
          }}
        >
          <Image
            src="/jd-exambook-logo.png"
            alt="JD Exambook Logo"
            width={54}
            height={54}
            priority
            style={{
              objectFit: "contain",
              borderRadius: "50%",
            }}
          />
          <span>JD Exambook</span>
        </Link>

        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/login" style={outlineButton}>
            Login
          </Link>
          <Link href="/login" style={primaryButton}>
            Register
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: "80px 6%",
          textAlign: "center",
          background:
            "linear-gradient(135deg, rgba(234,245,255,0.88), rgba(233,255,243,0.88))",
        }}
      >
        <p
          style={{
            color: "#00895a",
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          SSC EXAM PREPARATION PLATFORM
        </p>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 54px)",
            maxWidth: 850,
            margin: "20px auto",
            lineHeight: 1.2,
          }}
        >
          Prepare for SSC Exams with JD Exambook
        </h1>

        <p
          style={{
            maxWidth: 700,
            margin: "0 auto 28px",
            fontSize: 18,
            color: "#526173",
            lineHeight: 1.7,
          }}
        >
          Explore SSC exam preparation resources.
          Subject-wise practice, chapter-wise questions,
          previous year papers and mock tests are being
          developed for JD Exambook.
        </p>

        <Link href="/login" style={primaryButton}>
          Get Started
        </Link>
      </section>

      {/* SSC Exams */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Explore SSC Exams</h2>
        <p style={subtitleStyle}>
          Choose your examination to explore preparation
          sections.
        </p>

        <div style={gridStyle}>
          {exams.map((exam) => (
            <Link
              key={exam.code}
              href={`/exams/${exam.code}`}
              style={cardStyle}
            >
              <div style={{ fontSize: 30 }}>📘</div>
              <h3>{exam.name}</h3>
              <p style={{ color: "#687586" }}>
                Explore exam details and preparation
                sections.
              </p>
              <span
                style={{
                  color: "#0866c2",
                  fontWeight: 700,
                }}
              >
                Explore Exam →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section
        style={{
          padding: "65px 6%",
          background: "rgba(238,245,251,0.85)",
        }}
      >
        <h2 style={headingStyle}>Subject-wise Practice</h2>
        <p style={subtitleStyle}>
          SSC question banks are under development.
        </p>

        <div style={gridStyle}>
          {subjects.map((subject) => (
            <div key={subject.name} style={cardStyle}>
              <div
                style={{
                  fontSize: 32,
                  color: "#00a86b",
                  fontWeight: 800,
                }}
              >
                {subject.symbol}
              </div>
              <h3>{subject.name}</h3>
              <p style={{ color: "#687586" }}>
                Chapter-wise and topic-wise practice
              </p>
              <strong style={{ color: "#00895a" }}>
                Coming Soon
              </strong>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Features */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>
          More Preparation Features
        </h2>

        <div style={gridStyle}>
          {[
            "Full Mock Tests",
            "Previous Year Papers",
            "Chapter-wise Practice",
          ].map((feature) => (
            <div key={feature} style={cardStyle}>
              <h3>{feature}</h3>
              <p style={{ color: "#687586" }}>
                This feature is under development.
              </p>
              <strong style={{ color: "#00895a" }}>
                Coming Soon
              </strong>
            </div>
          ))}
        </div>
      </section>

      {/* Login Section */}
      <section
        style={{
          padding: "55px 6%",
          textAlign: "center",
          background: "#101820",
          color: "#ffffff",
        }}
      >
        <h2>Start Your Preparation Journey</h2>
        <p
          style={{
            color: "#cbd5e1",
            marginBottom: 28,
          }}
        >
          Create your JD Exambook account to explore
          exam preparation sections.
        </p>

        <Link href="/login" style={primaryButton}>
          Login / Register
        </Link>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: 24,
          color: "#687586",
          fontSize: 14,
        }}
      >
        © {new Date().getFullYear()} JD Exambook.
        All rights reserved.
      </footer>
    </main>
  );
}

const primaryButton = {
  display: "inline-block",
  background: "#0866c2",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: 9,
  textDecoration: "none",
  fontWeight: 700,
};

const outlineButton = {
  ...primaryButton,
  background: "#ffffff",
  color: "#0866c2",
  border: "1px solid #0866c2",
};

const sectionStyle = {
  padding: "65px 6%",
  maxWidth: 1400,
  margin: "0 auto",
};

const headingStyle = {
  textAlign: "center",
  fontSize: "clamp(26px, 4vw, 36px)",
  marginBottom: 12,
};

const subtitleStyle = {
  textAlign: "center",
  color: "#687586",
  marginBottom: 35,
  lineHeight: 1.6,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
};

const cardStyle = {
  background: "rgba(255,255,255,0.94)",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 24,
  textDecoration: "none",
  color: "#101820",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
