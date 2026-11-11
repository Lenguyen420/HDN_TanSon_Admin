import { ensureStoredAdminToken } from "@/services/auth.service";

export type EditorImageUploadResponse = {
  error: number;
  message: string;
  data?: {
    domain?: string;
    images?: string[];
  };
};

const API_URL = "https://be.government.kidoedu.vn";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

function validateImage(file: File) {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );

  if (!hasAllowedExtension) {
    throw new Error("Chỉ hỗ trợ ảnh jpg, jpeg, png, gif hoặc webp.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Ảnh tải lên tối đa 5 MB.");
  }
}

export async function uploadEditorImage(
  file: File,
): Promise<EditorImageUploadResponse> {
  validateImage(file);

  const formData = new FormData();
  formData.set("file", file);
  const token = await ensureStoredAdminToken();

  const response = await fetch(`${API_URL}/upload_image_api`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = (await response.json()) as EditorImageUploadResponse;

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải ảnh lên.");
  }

  return data;
}

export function getUploadedImageUrl(response: EditorImageUploadResponse) {
  const domain = response.data?.domain ?? "";
  const image = response.data?.images?.[0] ?? "";

  return image ? `${domain}${image}` : "";
}
