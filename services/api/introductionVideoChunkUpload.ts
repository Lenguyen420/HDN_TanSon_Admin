import axiosInstance from "./axiosConfig.ts";
export async function uploadVideoChunks(
  file: File,
  progress: (message: string) => void,
) {
  const root = "/association/introduction-videos";
  const started = (
    await axiosInstance.post<{
      data: { id: string; chunkSize: number; count: number };
    }>(root, { name: file.name, size: file.size, chunkSize: 256 * 1024 })
  ).data.data;
  if (
    !/^[a-f0-9-]{36}$/.test(started.id) ||
    ![256 * 1024, 2 * 1024 * 1024].includes(started.chunkSize) ||
    started.count !== Math.ceil(file.size / started.chunkSize)
  )
    throw Error("Phiên tải video không hợp lệ.");
  const session = root + "/" + started.id;
  try {
    let completed = 0;
    for (let start = 0; start < started.count; start += 3) {
      const results = await Promise.allSettled(
        Array.from(
          { length: Math.min(3, started.count - start) },
          async (_, offset) => {
            const index = start + offset;
            await axiosInstance.put(
              session + "/chunks/" + index,
              file.slice(
                index * started.chunkSize,
                Math.min(file.size, (index + 1) * started.chunkSize),
              ),
              {
                headers: { "Content-Type": "application/octet-stream" },
                timeout: 60000,
              },
            );
            completed++;
            progress(
              "Đang tải video " +
                Math.round((completed / started.count) * 100) +
                "%…",
            );
          },
        ),
      );
      const failed = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failed) throw failed.reason;
    }
    const result = (
      await axiosInstance.post<{ data: { url: string } }>(
        session + "/complete",
        {},
      )
    ).data.data;
    if (
      !/^\/api\/v1\/public\/introduction-videos\/[a-f0-9-]{36}$/.test(
        result.url,
      )
    )
      throw Error("Đường dẫn video không hợp lệ.");
    return result.url;
  } catch (error) {
    await axiosInstance
      .delete(session, { timeout: 5000 })
      .catch(() => undefined);
    throw error;
  }
}
