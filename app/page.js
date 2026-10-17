
import Link from "next/link";

export const metadata = {
  title: "JD Exambook | SSC Exam Preparation & Online Practice",
  description:
    "Explore SSC CGL, CHSL, CPO, GD and Stenographer exam preparation with JD Exambook. Subject-wise practice, mock tests and previous year papers are coming soon.",
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
      }}
    >
      <header
        style={{
          background: "#ffffff",
          padding: "18px 6%",
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
            color: "#0866c2",
            fontSize: 25,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          JD Exambook
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

      <section
        style={{
          padding: "80px 6%",
          textAlign: "center",
          background:
            "linear-gradient(135deg, #eaf5ff 0%, #e9fff3 100%)",
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
          Your destination for SSC exam preparation.
          Explore exam-wise learning resources and get
          ready for upcoming subject-wise practice,
          chapter-wise questions and mock tests.
        </p>

        <Link href="/login" style={primaryButton}>
          Get Started
        </Link>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Explore SSC Exams</h2>
        <p style={subtitleStyle}>
          Choose your examination to explore available
          preparation sections.
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

      <section
        style={{
          ...sectionStyle,
          background: "#eef5fb",
        }}
      >
        <h2 style={headingStyle}>Subject-wise Practice</h2>
        <p style={subtitleStyle}>
          Our SSC question bank is being developed.
          Practice features will be available soon.
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

      <section
        style={{
          padding: "55px 6%",
          textAlign: "center",
          background: "#101820",
          color: "white",
        }}
      >
        <h2>Start Your Preparation Journey</h2>
        <p style={{ color: "#cbd5e1", marginBottom: 28 }}>
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
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 24,
  textDecoration: "none",
  color: "#101820",
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};
