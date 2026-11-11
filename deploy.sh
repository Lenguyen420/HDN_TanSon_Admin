#!/usr/bin/env bash

set -Eeuo pipefail

readonly APP_NAME="admin-hanhchinhcong"
readonly APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly LOCK_FILE="/tmp/${APP_NAME}.deploy.lock"

on_error() {
  echo "Triển khai thất bại ở dòng ${1}." >&2
}

trap 'on_error "$LINENO"' ERR

cd "$APP_DIR"

# Không cho hai tiến trình triển khai chạy đồng thời.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Một tiến trình triển khai khác đang chạy." >&2
  exit 1
fi

echo "Đang cập nhật mã nguồn..."
git pull --ff-only

echo "Đang cài đặt dependencies..."
npm ci

echo "Đang build ứng dụng..."
npm run build

echo "Đang reload PM2..."
pm2 reload "$APP_NAME" --update-env

echo "Triển khai thành công."
