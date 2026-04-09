/**
 * Root Layout
 */

import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "../styles/globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "QuizBuzz — Interactive Quiz Platform",
  description:
    "Create live quiz sessions, invite students, and run exciting rounds with fast scoring and live leaderboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable} bg-[#0a0118]`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(22, 18, 45, 0.9)",
              color: "#f0eeff",
              borderRadius: "14px",
              fontFamily: "var(--font-body)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(16px)",
            },
          }}
        />
      </body>
    </html>
  );
}
