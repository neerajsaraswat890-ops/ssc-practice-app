export default function robots() {
  return {
    // Keep pages crawlable so Google can read their noindex meta tags.
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://www.jdexambook.in/sitemap.xml",
    host: "https://www.jdexambook.in",
  };
}
