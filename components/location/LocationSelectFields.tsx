"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getProvinces,
  getWards,
  type Province,
  type Ward,
} from "@/services/locations";

type LocationSelectFieldsProps = {
  province: string;
  ward: string;
  provinceCode?: string;
  wardCode?: string;
  onProvinceChange: (value: string) => void;
  onWardChange: (value: string) => void;
  onProvinceCodeChange?: (value: string) => void;
  onWardCodeChange?: (value: string) => void;
};

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60";
const currentWardOptionValue = "__current_ward__";

function findProvince(provinces: Province[], value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return provinces.find(
    (province) =>
      province.code.toLowerCase() === normalized ||
      province.name.toLowerCase() === normalized,
  );
}

export default function LocationSelectFields({
  province,
  ward,
  provinceCode,
  wardCode,
  onProvinceChange,
  onWardChange,
  onProvinceCodeChange,
  onWardCodeChange,
}: LocationSelectFieldsProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [locationError, setLocationError] = useState("");

  const selectedProvince = useMemo(
    () => findProvince(provinces, provinceCode || province),
    [province, provinceCode, provinces],
  );

  const selectedProvinceCode = selectedProvince?.code ?? "";
  const availableWards = useMemo(
    () => (selectedProvinceCode ? wards : []),
    [selectedProvinceCode, wards],
  );
  const selectedWard = useMemo(() => {
    const normalizedCode = (wardCode ?? "").trim().toLowerCase();
    const normalizedName = ward.trim().toLowerCase();

    return availableWards.find(
      (item) =>
        item.code.toLowerCase() === normalizedCode ||
        item.name.toLowerCase() === normalizedName,
    );
  }, [availableWards, ward, wardCode]);
  const selectedWardCode = selectedWard?.code ?? "";
  const hasCurrentWardOption =
    Boolean(ward) && !availableWards.some((item) => item.name === ward);
  const wardSelectValue =
    selectedWardCode || (hasCurrentWardOption ? currentWardOptionValue : "");

  useEffect(() => {
    let ignore = false;

    async function loadProvinces() {
      setLoadingProvinces(true);
      setLocationError("");

      try {
        const data = await getProvinces();

        if (!ignore) {
          setProvinces(data);
        }
      } catch {
        if (!ignore) {
          setLocationError("Khong the tai danh sach tinh/thanh.");
        }
      } finally {
        if (!ignore) {
          setLoadingProvinces(false);
        }
      }
    }

    void loadProvinces();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!selectedProvinceCode) {
      return;
    }

    async function loadWards() {
      setLoadingWards(true);
      setLocationError("");

      try {
        const data = await getWards(selectedProvinceCode);

        if (!ignore) {
          setWards(data);
        }
      } catch {
        if (!ignore) {
          setWards([]);
          setLocationError("Khong the tai danh sach xa/phuong.");
        }
      } finally {
        if (!ignore) {
          setLoadingWards(false);
        }
      }
    }

    void loadWards();

    return () => {
      ignore = true;
    };
  }, [selectedProvinceCode]);

  return (
    <>
      <div>
        <label className="text-sm font-bold text-slate-700">
          Tỉnh / Thành phố
        </label>

        <select
          value={selectedProvinceCode}
          onChange={(event) => {
            const nextProvince = provinces.find(
              (item) => item.code === event.target.value,
            );

            onProvinceChange(nextProvince?.name ?? "");
            onProvinceCodeChange?.(nextProvince?.code ?? "");
            onWardChange("");
            onWardCodeChange?.("");
          }}
          disabled={loadingProvinces}
          className={fieldClassName}
        >
          <option value="">
            {loadingProvinces ? "Đang tải tỉnh/thành..." : "Chọn tỉnh/thành"}
          </option>
          {provinces.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-700">
          Xã / Phường
        </label>

        <select
          value={wardSelectValue}
          onChange={(event) => {
            const nextWard = availableWards.find(
              (item) => item.code === event.target.value,
            );

            onWardChange(nextWard?.name ?? "");
            onWardCodeChange?.(nextWard?.code ?? "");
          }}
          disabled={!selectedProvinceCode || loadingWards}
          className={fieldClassName}
        >
          <option value="">
            {!selectedProvinceCode
              ? "Chọn tỉnh/thành trước"
              : loadingWards
                ? "Đang tải xã/phường..."
                : "Chọn xã/phường"}
          </option>
          {hasCurrentWardOption ? (
            <option value={currentWardOptionValue}>{ward}</option>
          ) : null}
          {availableWards.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>

        {locationError ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            {locationError}
          </p>
        ) : null}
      </div>
    </>
  );
}
