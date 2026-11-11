import { NextRequest } from "next/server";
import { backendRequest, json, passResponse, unavailable } from "@/lib/backend";
export async function GET(request: NextRequest) {
  const token = request.cookies.get("admin_access_token")?.value;
  if (!token) return json({ message: "Vui lòng đăng nhập." }, 401);
  try {
    return passResponse(
      await backendRequest("/auth/me", {
        headers: { Authorization: "Bearer " + token },
      }),
    );
  } catch {
    return unavailable();
  }
}
