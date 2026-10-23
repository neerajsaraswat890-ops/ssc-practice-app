// Login-only pages should not appear in search results.
// Leave crawling enabled so search engines can see this noindex directive.
export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function PrivateLayout({ children }) {
  return children;
}
