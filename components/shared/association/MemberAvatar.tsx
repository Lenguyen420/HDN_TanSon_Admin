"use client";
import Image from "next/image";
import { imageUrl } from "@/services/image-url";
export default function MemberAvatar({name,avatar}: {name: string; avatar?: unknown}) {
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
  const source = avatar ? imageUrl(avatar) : "";
  return <span className="member-avatar record-member-photo" aria-hidden="true"><span>{initials}</span>{source && <Image key={source} unoptimized src={source} alt="" width={40} height={40} onError={(event) => {event.currentTarget.style.display="none";}}/>}</span>;
}
