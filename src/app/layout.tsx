import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "태국 여행 플래너",
  description: "나만의 태국 여행 일정을 계획해보세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          defer
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=ko`}
        ></script>
      </head>
      <body className="m-0 p-0 overflow-hidden">
          {children}
      </body>
    </html>
  );
} 