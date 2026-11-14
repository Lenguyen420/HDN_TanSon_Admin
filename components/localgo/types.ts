// Mirrors the existing Backend LocalGo DTO and model.
export type Coordinates = { latitude: number; longitude: number };
export type LocalGoCategory = { code: string; name: string };
export type LocalGoMember = { id: string; name: string; company?: string; phone?: string; email?: string; avatar?: string };
export type PlaceInput = {
  name: string;
  category: string;
  address: string;
  description: string;
  content: string;
  phone: string;
  website: string;
  zalo: string;
  coverImage: string;
  images: string[];
  openingHours: { day: number; open: string; close: string }[];
  location: { type: "Point"; coordinates: [number, number] };
};
export type LocalGoPlace = PlaceInput & {
  id: string;
  memberId: string | null;
  createdBy: string;
  isVisible: boolean;
  createdAt: string;
};
