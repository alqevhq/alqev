import "./globals.css";

export const metadata = {
  title: "HUMANITY OS",
  description: "AI-powered operating system for humanity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}