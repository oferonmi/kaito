import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], weight: "300", });

export const metadata = {
  title: "Knaitsys - Text",
  description: "Process text documents using NLP",
};

export default function textProcessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gradient-to-r from-teal-100 to-teal-100`}
      >
        <Header menu={[]} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
