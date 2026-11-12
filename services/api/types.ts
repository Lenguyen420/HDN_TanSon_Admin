import type { AssociationRecord } from "../association-store.ts";

export type ApiRecord = AssociationRecord;
export type RecordPayload = Omit<AssociationRecord, "id"> & { id?: string };
export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};
export type ListResponse = {
  data: AssociationRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  };
};
