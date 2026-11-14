"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, Minus, Plus } from "lucide-react";
import type { Coordinates } from "./types";
import styles from "./localgo.module.css";

const TILE = 256;
const MAX_LAT = 85.05112878;
const initialCenter = { latitude: 10.815, longitude: 106.63 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function project(point: Coordinates, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin(clamp(point.latitude, -MAX_LAT, MAX_LAT) * Math.PI / 180);
  return { x: (point.longitude + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}
function unproject(x: number, y: number, zoom: number): Coordinates {
  const scale = TILE * 2 ** zoom;
  return {
    latitude: Number(clamp(Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180 / Math.PI, -MAX_LAT, MAX_LAT).toFixed(6)),
    longitude: Number((((x / scale * 360) % 360 + 360) % 360 - 180).toFixed(6)),
  };
}

export default function CoordinatePicker({ value, onChange, disabled = false }: {
  value: Coordinates | null;
  onChange: (value: Coordinates) => void;
  disabled?: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [center, setCenter] = useState(value ?? initialCenter);
  const [zoom, setZoom] = useState(15);
  const [tileError, setTileError] = useState(false);
  const height = 300;
  useEffect(() => {
    if (!surface.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(surface.current);
    return () => observer.disconnect();
  }, []);
  const origin = project(center, zoom);
  const left = origin.x - width / 2;
  const top = origin.y - height / 2;
  const marker = value ? project(value, zoom) : null;
  const tiles = [];
  for (let x = Math.floor(left / TILE); x <= Math.floor((left + width) / TILE); x++) {
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + height) / TILE); y++) {
      if (y < 0 || y >= 2 ** zoom) continue;
      const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      // Fixed OpenStreetMap tile origin; tiles contain no member or place data.
      tiles.push(<Image unoptimized key={`${zoom}/${x}/${y}`} src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`} alt="" draggable={false} width={TILE} height={TILE} onError={() => setTileError(true)} style={{ position: "absolute", left: x * TILE - left, top: y * TILE - top, maxWidth: "none" }} />);
    }
  }
  function pan(dx: number, dy: number) {
    setCenter(unproject(origin.x + dx, origin.y + dy, zoom));
  }
  return <div className={styles.coordinates}>
    <p id="localgo-map-help">Nhấn trên bản đồ để đặt ghim. Dùng phím mũi tên để di chuyển, Enter để chọn tâm bản đồ.</p>
    <div className={styles.map} style={{ height }}>
      <div ref={surface} className={styles.mapSurface} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label="Chọn tọa độ địa điểm trên bản đồ" aria-describedby="localgo-map-help" onClick={(event) => {
        if (disabled) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onChange(unproject(left + event.clientX - rect.left, top + event.clientY - rect.top, zoom));
      }} onKeyDown={(event) => {
        if (disabled) return;
        const movement: Record<string, [number, number]> = { ArrowLeft: [-128, 0], ArrowRight: [128, 0], ArrowUp: [0, -128], ArrowDown: [0, 128] };
        if (movement[event.key]) { event.preventDefault(); pan(...movement[event.key]); }
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onChange(center); }
      }}>
        {tiles}
        <span className={styles.crosshair} aria-hidden="true">+</span>
        {marker && <MapPin className={styles.marker} size={32} fill="#fff" style={{ left: marker.x - left, top: marker.y - top }} aria-hidden="true" />}
      </div>
      <div className={styles.mapControls}>
        <button type="button" className="icon-button" disabled={disabled || zoom === 19} aria-label="Phóng to bản đồ" onClick={() => { setTileError(false); setZoom(zoom + 1); }}><Plus size={18} /></button>
        <button type="button" className="icon-button" disabled={disabled || zoom === 3} aria-label="Thu nhỏ bản đồ" onClick={() => { setTileError(false); setZoom(zoom - 1); }}><Minus size={18} /></button>
        <button type="button" className="icon-button" disabled={disabled || !value} aria-label="Về tọa độ đã chọn" onClick={() => value && setCenter(value)}><MapPin size={18} /></button>
      </div>
      <div className={styles.mapPan} aria-label="Di chuyển bản đồ">
        {([["↑", "Di chuyển lên", 0, -128], ["←", "Di chuyển sang trái", -128, 0], ["→", "Di chuyển sang phải", 128, 0], ["↓", "Di chuyển xuống", 0, 128]] as const).map(([label, name, dx, dy]) => <button key={name} type="button" className="icon-button" disabled={disabled} aria-label={name} onClick={() => pan(dx, dy)}>{label}</button>)}
      </div>
      <a className={styles.attribution} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
    {tileError && <p role="status">Không tải được bản đồ. Bạn vẫn có thể nhập tọa độ bên dưới.</p>}
    <div className="form-grid">
      <label className="form-field"><span>Vĩ độ *</span><input type="number" name="latitude" required min={-90} max={90} step="any" disabled={disabled} value={value?.latitude ?? ""} onChange={(event) => {
        if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) onChange({ latitude: event.target.valueAsNumber, longitude: value?.longitude ?? center.longitude });
      }} /></label>
      <label className="form-field"><span>Kinh độ *</span><input type="number" name="longitude" required min={-180} max={180} step="any" disabled={disabled} value={value?.longitude ?? ""} onChange={(event) => {
        if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) onChange({ longitude: event.target.valueAsNumber, latitude: value?.latitude ?? center.latitude });
      }} /></label>
    </div>
  </div>;
}
