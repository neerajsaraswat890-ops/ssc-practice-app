const baseUrl = "https://www.jdexambook.in";

export default function sitemap() {
  // Only publicly accessible, indexable URLs belong in the sitemap.
  // Exam and test pages require authentication, so they are excluded.
  return [
    {
      url: `${baseUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
