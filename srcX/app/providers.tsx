"use client";

import { Windmill } from "@roketid/windmill-react-ui";
import { Toaster } from "react-hot-toast";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {children}
    </Windmill>
  );
}