import "./globals.css";

export const metadata = {
  title: { default: "Aftertone — Electronic music archive", template: "%s · Aftertone" },
  description: "Discover independent electronic releases, listen to previews, and download tracks.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><a className="skip" href="#main">Skip to main content</a>{children}</body></html>;
}
