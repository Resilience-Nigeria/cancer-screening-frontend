import DashboardShell from "../components/layout/DashboardShell";

export default function NcsrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
