
export default function sitemap() {
  const baseUrl = "https://www.jdexambook.in";

  const examCodes = [
    "SSC_CGL",
    "SSC_CHSL",
    "SSC_CPO",
    "SSC_GD",
    "SSC_STENO",
  ];

  const homePage = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  };

  const examPages = examCodes.map((code) => ({
    url: `${baseUrl}/exams/${code}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [homePage, ...examPages];
}
