import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import RemoteQueueGuard from "@/components/auth/RemoteQueueGuard";
import AppointmentRatingsPage from "@/components/appointments/AppointmentRatingsPage";
export const metadata:Metadata={title:"Đánh giá người tiếp nhận tại quầy"};
export default function Page(){return <AppShell activeHref="/admin/appointment-ratings"><RemoteQueueGuard><AppointmentRatingsPage/></RemoteQueueGuard></AppShell>}
