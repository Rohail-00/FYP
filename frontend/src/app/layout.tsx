import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "PakLaw AI",
  description: "Verify proposed amendments against active federal statutes.",
};

/**
 * Inline script to apply persisted theme before first paint.
 * Prevents the flash of light theme when user has dark mode saved.
 */
const themeScript = `
  (function() {
    try {
      if (localStorage.getItem('pak_theme') === 'dark') {
        document.documentElement.classList.add('dark-theme');
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>
          <div className="app-container">
            <Navbar />
            {children}
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
