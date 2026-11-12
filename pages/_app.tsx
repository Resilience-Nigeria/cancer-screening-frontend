import "../styles/globals.css";
import "tailwindcss/tailwind.css";
import "leaflet/dist/leaflet.css";

import React from "react";
import { useRouter } from "next/router";
import { Windmill } from "@roketid/windmill-react-ui";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

import OverdueResultsAlert from "../components/OverdueResultsAlert";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  if (typeof window === "undefined") {
    React.useLayoutEffect = React.useEffect;
  }

  // Admin overdue-results pop-up: staff pages only (never on login or public pages).
  const showOverdueAlert =
    router.pathname.startsWith("/ncsr") && !router.pathname.includes("login");

  return (
    <Windmill usePreferences={true}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            background: "#fff",
            color: "#111827",
            border: "1px solid #dcfce7",
          },
          success: {
            iconTheme: {
              primary: "#15803d",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />
      {showOverdueAlert && <OverdueResultsAlert />}
      <Component {...pageProps} />
    </Windmill>
  );
}

export default MyApp;