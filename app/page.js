
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "JD Exambook | Government Exam Preparation & Online Practice",
  description:
    "JD Exambook provides government exam preparation resources for SSC CGL, CHSL, CPO, GD and Stenographer. Explore exam-wise learning and upcoming online practice tests.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "JD Exambook | Government Exam Preparation",
    description:
      "Explore government exam preparation resources, including SSC exams, with JD Exambook.",
    url: "https://www.jdexambook.in/",
    siteName: "JD Exambook",
    type: "website",
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

const upcomingFeatures = [
  "Full Mock Tests",
  "Previous Year Papers",
  "Chapter-wise Practice",
];

export default function HomePage() {
  return (
    <main className="jd-home">
      {/* Header */}
      <header className="jd-header">
        <Link href="/" className="jd-brand">
          <Image
            src="/jd-exambook-logo.png"
            alt="JD Exambook Logo"
            width={56}
            height={56}
            priority
            className="jd-logo"
          />
          <span>JD Exambook</span>
        </Link>

        <nav className="jd-nav">
          <Link href="/login" className="jd-btn jd-outline">
            Login
          </Link>
          <Link href="/login" className="jd-btn jd-primary">
            Register
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="jd-hero">
        <div className="jd-watermark" aria-hidden="true">
          <Image
            src="/jd-exambook-logo.png"
            alt=""
            width={700}
            height={700}
            className="jd-watermark-image"
            priority
          />
        </div>

        <div className="jd-hero-content">
          <p className="jd-eyebrow">
            GOVERNMENT EXAM PREPARATION PLATFORM
          </p>

          <h1>
            Prepare for Government Exams with JD Exambook
          </h1>

          <p className="jd-hero-description">
            Explore SSC and government exam preparation resources.
            Subject-wise practice, chapter-wise questions,
            previous year papers and mock tests are being
            developed for JD Exambook.
          </p>

          <Link
            href="/login"
            className="jd-btn jd-primary jd-cta"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* SSC Exams */}
      <section className="jd-section">
        <h2>Explore SSC Exams</h2>

        <p className="jd-subtitle">
          Choose your examination to explore available
          preparation sections. Login or register to continue.
        </p>

        <div className="jd-grid">
          {exams.map((exam) => (
            <Link
              key={exam.code}
              href="/login"
              className="jd-card jd-exam-card"
            >
              <div className="jd-card-icon">📘</div>

              <h3>{exam.name}</h3>

              <p>
                Explore exam details and preparation
                sections after login.
              </p>

              <span className="jd-card-link">
                Explore Exam →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Subject-wise Practice */}
      <section className="jd-section jd-soft-section">
        <h2>Subject-wise Practice</h2>

        <p className="jd-subtitle">
          Our SSC question banks are under development.
          Practice features will be available soon.
        </p>

        <div className="jd-grid">
          {subjects.map((subject) => (
            <div
              key={subject.name}
              className="jd-card"
            >
              <div className="jd-subject-icon">
                {subject.symbol}
              </div>

              <h3>{subject.name}</h3>

              <p>
                Chapter-wise and topic-wise practice
              </p>

              <span className="jd-coming">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Features */}
      <section className="jd-section">
        <h2>More Preparation Features</h2>

        <p className="jd-subtitle">
          More learning and practice options are
          being developed.
        </p>

        <div className="jd-grid">
          {upcomingFeatures.map((feature) => (
            <div
              key={feature}
              className="jd-card"
            >
              <div className="jd-card-icon">📚</div>

              <h3>{feature}</h3>

              <p>
                This feature is under development.
              </p>

              <span className="jd-coming">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="jd-bottom-cta">
        <h2>Start Your Preparation Journey</h2>

        <p>
          Create your JD Exambook account to explore
          exam preparation sections.
        </p>

        <Link
          href="/login"
          className="jd-btn jd-primary jd-cta"
        >
          Login / Register
        </Link>
      </section>

      {/* Footer */}
      <footer className="jd-footer">
        © 2026 JD Exambook. All rights reserved.
      </footer>

      <style>{`
        .jd-home {
          min-height: 100vh;
          background: #f7f9fc;
          color: #101820;
          font-family: Arial, sans-serif;
        }

        .jd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding: 14px 6%;
          background: #ffffff;
          border-bottom: 1px solid #e5eaf0;
        }

        .jd-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #0866c2;
          text-decoration: none;
          font-size: clamp(20px, 3vw, 27px);
          font-weight: 800;
        }

        .jd-logo {
          width: 56px;
          height: 56px;
          object-fit: contain;
          border-radius: 50%;
        }

        .jd-nav {
          display: flex;
          gap: 12px;
        }

        .jd-btn {
          display: inline-block;
          padding: 12px 22px;
          border-radius: 9px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          text-align: center;
          transition: transform 0.2s ease;
        }

        .jd-btn:hover {
          transform: translateY(-2px);
        }

        .jd-primary {
          background: #0866c2;
          color: #ffffff;
        }

        .jd-outline {
          background: #ffffff;
          color: #0866c2;
          border: 1px solid #0866c2;
        }

        .jd-hero {
          position: relative;
          isolation: isolate;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 510px;
          padding: 75px 6%;
          overflow: hidden;
          text-align: center;
          background: linear-gradient(
            135deg,
            #eaf5ff 0%,
            #e9fff3 100%
          );
        }

        .jd-watermark {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .jd-watermark-image {
          width: min(75vw, 570px);
          height: auto;
          max-height: 90%;
          object-fit: contain;
          opacity: 0.10;
        }

        .jd-hero-content {
          position: relative;
          z-index: 1;
          max-width: 950px;
          margin: auto;
        }

        .jd-eyebrow {
          color: #00895a;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .jd-hero h1 {
          max-width: 900px;
          margin: 22px auto;
          font-size: clamp(32px, 5vw, 54px);
          line-height: 1.2;
        }

        .jd-hero-description {
          max-width: 740px;
          margin: 0 auto 30px;
          color: #526173;
          font-size: 18px;
          line-height: 1.8;
        }

        .jd-cta {
          padding: 14px 28px;
        }

        .jd-section {
          padding: 65px 6%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .jd-section h2 {
          text-align: center;
          font-size: clamp(26px, 4vw, 36px);
          margin: 0 0 14px;
        }

        .jd-subtitle {
          text-align: center;
          color: #687586;
          line-height: 1.7;
          margin: 0 auto 35px;
          max-width: 750px;
        }

        .jd-soft-section {
          max-width: none;
          background: #eef5fb;
        }

        .jd-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .jd-card {
          display: block;
          padding: 26px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
          color: #101820;
          text-decoration: none;
        }

        .jd-exam-card:hover {
          border-color: #0866c2;
        }

        .jd-card h3 {
          margin: 14px 0 10px;
          font-size: 20px;
        }

        .jd-card p {
          color: #687586;
          line-height: 1.6;
          font-size: 15px;
        }

        .jd-card-icon {
          font-size: 30px;
        }

        .jd-subject-icon {
          font-size: 32px;
          font-weight: 800;
          color: #00a86b;
        }

        .jd-card-link {
          color: #0866c2;
          font-weight: 700;
        }

        .jd-coming {
          color: #00895a;
          font-weight: 700;
        }

        .jd-bottom-cta {
          padding: 60px 6%;
          text-align: center;
          background: #101820;
          color: #ffffff;
        }

        .jd-bottom-cta h2 {
          font-size: clamp(25px, 4vw, 34px);
        }

        .jd-bottom-cta p {
          color: #cbd5e1;
          margin-bottom: 28px;
          line-height: 1.7;
        }

        .jd-footer {
          padding: 25px;
          text-align: center;
          color: #687586;
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .jd-header {
            padding: 12px 4%;
          }

          .jd-brand {
            font-size: 19px;
            gap: 7px;
          }

          .jd-logo {
            width: 43px;
            height: 43px;
          }

          .jd-nav {
            gap: 7px;
          }

          .jd-nav .jd-btn {
            padding: 9px 12px;
            font-size: 13px;
          }

          .jd-hero {
            min-height: 480px;
            padding: 65px 5%;
          }

          .jd-watermark-image {
            width: 85vw;
            opacity: 0.10;
          }

          .jd-hero-description {
            font-size: 16px;
          }

          .jd-section {
            padding: 48px 5%;
          }
        }
      `}</style>
    </main>
  );
}
