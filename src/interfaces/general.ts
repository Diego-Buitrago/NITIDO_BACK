import { Request } from 'express';

export interface Pagination {
  limit: number;
  offset: number;
  sortField: string;
  sortOrder: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number | null;
    userName: string;
  };
}

export interface GeneralForm {
  name: string;
  stateId: number;
}  

export interface GeneralFilters {
  name: string;
  state: number | null
}

export interface GeneralList {
  id: number;
  name: string;
}

export type GeneralResponse = { message: string, id?: number | null };

export type UserContext = { userId: number; userName: string };