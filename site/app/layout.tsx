import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "PomoIsland — Focus without another tab",
  description:
    "PomoIsland is a calm, top-edge Pomodoro timer for every Mac.",
  icons: { icon: "/assets/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
