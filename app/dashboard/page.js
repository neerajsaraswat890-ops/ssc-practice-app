
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

const FALLBACK_EXAMS = [
  { code: "SSC_CGL", name: "SSC CGL" },
  { code: "SSC_CHSL", name: "SSC CHSL" },
  { code: "SSC_CPO", name: "SSC CPO" },
  { code: "SSC_GD", name: "SSC GD" },
  { code: "SSC_STENO", name: "SSC Stenographer" },
  { code: "UPP_CONSTABLE", name: "UP Police Constable" },
  { code: "UPP_SI_CIVIL", name: "UP Police SI" },
  { code: "UPP_MINISTERIAL", name: "UP Police Ministerial / ASI" },
];

const EXTRA_EXAMS = [
  { code: "SSC_MTS", name: "SSC MTS", group: "SSC" },
  { code: "SSC_SELECTION_POST", name: "SSC Selection Post", group: "SSC" },
  { code: "RRB_NTPC", name: "RRB NTPC", group: "Railway" },
  { code: "RRB_GROUP_D", name: "RRB Group D", group: "Railway" },
  { code: "RRB_ALP", name: "RRB ALP", group: "Railway" },
  { code: "RRB_TECHNICIAN", name: "RRB Technician", group: "Railway" },
];

function getGroup(code) {
  if (code.startsWith("SSC_")) return "SSC";
  if (code.startsWith("UPP_")) return "UP Police";
  if (code.startsWith("RRB_")) return "Railway";
  return "Other";
}

function getDisplayName(code, fallback) {
  return (
    FALLBACK_EXAMS.find((exam) => exam.code === code)?.name ||
    fallback ||
    code.replaceAll("_", " ")
  );
}

function ExamSection({ title, subtitle, group, emoji, exams, onOpen }) {
  const items = exams.filter((exam) => exam.group === group);

  if (!items.length) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ marginBottom: "5px" }}>
        {emoji} {title}
      </h2>

      <p className="muted" style={{ marginBottom: "16px" }}>
        {subtitle}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
        }}
      >
        {items.map((exam) => (
          <button
            key={exam.code}
            type="button"
            disabled={!exam.available}
            onClick={() => onOpen(exam)}
            className="card"
            style={{
              textAlign: "left",
              cursor: exam.available ? "pointer" : "default",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: "20px",
              width: "100%",
              minHeight: "140px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "17px",
                color: "#101820",
              }}
            >
              {exam.name}
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: exam.available ? "#0866c2" : "#64748b",
              }}
            >
              {exam.available ? "Explore Exam →" : "Coming Soon"}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const router = useRouter();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const client = supabase();

    async function loadExams() {
      try {
        const { data, error } = await client
          .from("exams")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        const normalized = (data || [])
          .map((exam) => {
            const code = exam.exam_code || exam.code || "";

            return {
              code,
              name: getDisplayName(
                code,
                exam.exam_name || exam.name
              ),
              group: getGroup(code),
              available: true,
            };
          })
          .filter((exam) => exam.code);

        const existingCodes = new Set(
          normalized.map((exam) => exam.code)
        );

        const missingKnownExams = [...FALLBACK_EXAMS, ...EXTRA_EXAMS]
          .filter((exam) => !existingCodes.has(exam.code))
          .map((exam) => ({
            ...exam,
            group: exam.group || getGroup(exam.code),
            available: false,
          }));

        if (active) {
          setExams([...normalized, ...missingKnownExams]);
        }
      } catch (error) {
        if (active) {
          setExams([
            ...FALLBACK_EXAMS.map((exam) => ({
              ...exam,
              group: getGroup(exam.code),
              available: false,
            })),
            ...EXTRA_EXAMS.map((exam) => ({
              ...exam,
              available: false,
            })),
          ]);

          setErrorMessage(
            "Exam list could not be loaded. Please try again later."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    async function checkLogin() {
      try {
        const { data, error } = await client.auth.getUser();

        if (!active) return;

        if (error || !data?.user || data.user.is_anonymous) {
          setAuthorized(false);
          router.replace("/login");
          return;
        }

        setAuthorized(true);
        await loadExams();
      } catch (error) {
        if (active) {
          setAuthorized(false);
          router.replace("/login");
        }
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setErrorMessage("");

    const { error } = await supabase().auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setLoggingOut(false);
      return;
    }

    setAuthorized(false);
    router.replace("/login");
    router.refresh();
  }

  function openExam(exam) {
    if (!exam.available || !authorized) return;

    router.push("/exams/" + encodeURIComponent(exam.code));
  }

  if (!authorized) {
    return (
      <main
        className="wrap"
        style={{ padding: "48px 20px", textAlign: "center" }}
      >
        <p>Checking login...</p>
      </main>
    );
  }

  return (
    <>
      <header
        className="nav"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Image
            src="/jd-exambook-logo.png"
            alt="JD Exambook"
            width={48}
            height={48}
            priority
          />

          <div>
            <div
              style={{
                fontSize: "19px",
                fontWeight: 700,
              }}
            >
              JD Exambook
            </div>

            <div style={{ fontSize: "12px" }}>
              Student Dashboard
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            background: "#101820",
            color: "white",
            border: "1px solid #64748b",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </header>

      <main className="wrap">
        <div
          className="card"
          style={{
            padding: "24px",
            marginBottom: "28px",
            background:
              "linear-gradient(120deg, #e8f7ef, #eaf2ff)",
          }}
        >
          <h1 style={{ marginBottom: "8px", color: "#101820" }}>
            Choose Your Examination
          </h1>

          <p style={{ color: "#475569", margin: 0 }}>
            Select your exam to explore practice,
            previous year papers and mock tests.
          </p>
        </div>

        <section className="card" style={{padding:"20px 22px",marginBottom:26,border:"1px solid #bfdbfe",background:"#f2f8ff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap"}}>
            <div><h2 style={{margin:"0 0 6px",fontSize:21}}>★ Bookmarked Questions / बुकमार्क प्रश्न</h2><p style={{margin:0,color:"#475569"}}>Mock Test के दौरान सहेजे गए Maths, Reasoning, English और GK प्रश्न Subject-wise देखें।</p></div>
            <button type="button" onClick={()=>router.push("/dashboard/bookmarks")} style={{padding:"11px 16px",borderRadius:9,border:0,background:"#0866c2",color:"white",fontWeight:700,cursor:"pointer"}}>My Bookmarks →</button>
          </div>
        </section>

        {errorMessage && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {errorMessage}
          </p>
        )}

        {loading ? (
          <div className="card">
            Loading examinations...
          </div>
        ) : (
          <>
            <ExamSection
              title="SSC Examinations"
              subtitle="Staff Selection Commission"
              group="SSC"
              emoji="📘"
              exams={exams}
              onOpen={openExam}
            />

            <ExamSection
              title="UP Police Examinations"
              subtitle="Uttar Pradesh Police Recruitment"
              group="UP Police"
              emoji="🛡️"
              exams={exams}
              onOpen={openExam}
            />

            <ExamSection
              title="Railway Examinations"
              subtitle="Railway Recruitment Board"
              group="Railway"
              emoji="🚆"
              exams={exams}
              onOpen={openExam}
            />

            <ExamSection
              title="Other Examinations"
              subtitle="Additional competitive examinations"
              group="Other"
              emoji="📚"
              exams={exams}
              onOpen={openExam}
            />
          </>
        )}
      </main>
    </>
  );
}
