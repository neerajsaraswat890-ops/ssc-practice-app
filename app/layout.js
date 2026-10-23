
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.jdexambook.in"),

  title: {
    default: "JD Exambook | Government Exam Preparation & Online Practice",
    template: "%s | JD Exambook",
  },

  description:
    "JD Exambook offers government exam preparation resources for SSC CGL, CHSL, CPO, GD, MTS and Stenographer aspirants. Explore exam-wise learning and online practice.",

  keywords: [
    "JD Exambook",
    "JDExambook",
    "Government Exam Preparation",
    "Govt Exam Online Practice",
    "SSC Exam Preparation",
    "SSC CGL",
    "SSC CHSL",
    "SSC CPO",
    "SSC GD",
    "SSC MTS",
    "SSC Stenographer",
    "SSC Online Practice",
    "SSC Mock Test",
    "SSC Previous Year Questions",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    title: "JD Exambook | Government Exam Preparation",
    description:
      "Explore government exam preparation resources, including SSC exams, and online practice with JD Exambook.",
    url: "https://www.jdexambook.in",
    siteName: "JD Exambook",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
