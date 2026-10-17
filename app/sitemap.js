
export default function sitemap() {
  const baseUrl = "https://www.jdexambook.in";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
