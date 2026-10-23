
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.jdexambook.in"),

  title: {
    default: "JD Exambook | SSC Exam Preparation & Online Practice",
    template: "%s | JD Exambook",
  },

  description:
    "JD Exambook is an online exam preparation platform for SSC CGL, CHSL, CPO, GD, MTS and Stenographer aspirants. Explore exam-wise preparation and practice resources.",

  keywords: [
    "JD Exambook",
    "JDExambook",
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
    title: "JD Exambook | SSC Exam Preparation",
    description:
      "Explore SSC exam preparation and online practice resources with JD Exambook.",
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
