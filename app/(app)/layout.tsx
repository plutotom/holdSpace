import { Header } from "@/components/layout/Header";
import { OrgSync } from "@/components/org-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <OrgSync />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
