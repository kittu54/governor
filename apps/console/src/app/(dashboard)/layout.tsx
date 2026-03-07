import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
