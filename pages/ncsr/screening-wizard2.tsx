// pages/ncsr/screening-wizard.tsx
import dynamic from "next/dynamic";

const ScreeningWizard = dynamic(
  () => import("../components/ScreningWizard"),
  { ssr: false }
);

export default function ScreeningWizardPage() {
  return <ScreeningWizard />;
}