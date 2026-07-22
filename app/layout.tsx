import "./globals.css";

export const metadata = {
  title: "ALQEV",
  description: "AI-powered platform for managing complex life processes",
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