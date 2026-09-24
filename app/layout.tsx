import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. Campus — Academic Management Platform",
  description:
    "Dr. Campus: The intelligent academic management platform with OCR attendance, role-based dashboards, and full RLS security powered by Supabase."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">

      <body>
        {children}
      </body>

    </html>
  );
}