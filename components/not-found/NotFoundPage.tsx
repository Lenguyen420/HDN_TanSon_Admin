import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="eyebrow">HỘI DOANH NGHIỆP PHƯỜNG TÂN SƠN</span>
      <h1>Không tìm thấy trang</h1>
      <p>Trang này không còn thuộc hệ thống quản trị Hội.</p>
      <Link className="button button-primary" href="/">
        Về tổng quan
      </Link>
    </main>
  );
}
