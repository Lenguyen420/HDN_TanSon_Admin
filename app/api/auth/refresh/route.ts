import { NextRequest } from "next/server";
import {
  backendRequest,
  clearCookies,
  json,
  passResponse,
  sameOrigin,
  setCookies,
  unavailable,
} from "@/lib/backend";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const refreshToken = request.cookies.get("admin_refresh_token")?.value;
  if (!refreshToken)
    return clearCookies(json({ message: "Phiên đăng nhập đã hết hạn." }, 401));
  try {
    const response = await backendRequest("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      const result = await passResponse(response);
      return response.status === 401 ? clearCookies(result) : result;
    }
    const { data } = await response.json();
    if (!data?.accessToken || !data?.refreshToken) return unavailable();
    return setCookies(
      json({ data: { user: data.user, expiresIn: data.expiresIn } }),
      data,
    );
  } catch (error) {
    return unavailable(error);
  }
}
