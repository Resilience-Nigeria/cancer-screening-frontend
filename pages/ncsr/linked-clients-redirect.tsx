import { useEffect } from "react";
import { useRouter } from "next/router";

// The old "Linked Clients" page now lives inside Referred Clients (Incoming tab).
// This keeps any existing /ncsr/referred links, bookmarks and dashboard buttons working.
export default function LinkedClientsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ncsr/referred-clients?direction=received");
  }, [router]);
  return null;
}
