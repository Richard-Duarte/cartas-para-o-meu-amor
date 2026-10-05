import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/AdminApp";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <AdminApp />
    </div>
  );
}
