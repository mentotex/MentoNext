import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

export const metadata = {
  title: "mentonext example",
  description: "Live example app exercising every mentonext feature against a real WordPress site",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
