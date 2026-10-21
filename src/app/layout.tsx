import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Post-it Todo List",
  description: "작은 생각을 붙여두는 나만의 포스트잇 보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
