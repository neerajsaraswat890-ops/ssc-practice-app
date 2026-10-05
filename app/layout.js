import "./globals.css";

export const metadata = {
  title: "JD Exambook",
  description: "JD Exambook Exam Practice Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
