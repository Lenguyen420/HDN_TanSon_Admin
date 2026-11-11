import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import RemoteQueueGuard from "@/components/auth/RemoteQueueGuard";
import AppointmentDetailPage from "@/components/appointments/AppointmentDetailPage";
export const metadata:Metadata={title:"Chi tiết lịch hẹn"};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AppShell activeHref="/admin/appointments"><RemoteQueueGuard><AppointmentDetailPage id={id}/></RemoteQueueGuard></AppShell>}
