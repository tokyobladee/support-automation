import "./styles.css";

export const metadata = {
  title: "Support AI Copilot",
  description: "AI support automation platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
