import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import ShaderBackgroundWrapper from "@/components/ShaderBackgroundWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Avenge-Studio • AI Image & Video Generator",
    template: "%s • Avenge-Studio",
  },
  description:
    "Transform your ideas into stunning visuals. Generate AI images, create cinematic videos, and build custom characters with professional-grade quality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ShaderBackgroundWrapper />
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid #3f3f46",
              color: "#fff",
            },
            classNames: {
              description: "!text-white/80",
            },
          }}
        />
      </body>
    </html>
  );
}
