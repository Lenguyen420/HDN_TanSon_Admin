import { NextRequest } from "next/server";
import {
  backendRequest,
  clearCookies,
  json,
  sameOrigin,
  unavailable,
} from "@/lib/backend";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const refreshToken = request.cookies.get("admin_refresh_token")?.value;
  try {
    if (refreshToken) {
      const response = await backendRequest("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return unavailable();
    }
    return clearCookies(json({ success: true, message: "Đã đăng xuất." }));
  } catch {
    return unavailable();
  }
}
