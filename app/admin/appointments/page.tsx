import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import RemoteQueueGuard from "@/components/auth/RemoteQueueGuard";
import AppointmentsPage from "@/components/appointments/AppointmentsPage";
export const metadata:Metadata={title:"Quản lý hẹn làm việc"};
export default function Page(){return <AppShell activeHref="/admin/appointments"><RemoteQueueGuard><Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200"/>}><AppointmentsPage/></Suspense></RemoteQueueGuard></AppShell>}
