import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Providers from "@/components/provider";
import { Toaster } from "sonner";

export const metadata = {
  title: "ChatPDF",
  description: "Chat with any PDF using AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <Providers>
      <html lang="en">
        <body className="min-h-screen bg-white">{children}</body>
      </html>
      <Toaster position="top-center" richColors />
      </Providers>
    </ClerkProvider>
  );
}