export type ID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISOMonth = string; // 'YYYY-MM'

export type EntrySource = "manual" | "recurring";

export interface Entry {
  id: ID;
  date: ISODate;
  amount: number; // cents, signed
  categoryId: ID;
  accountId: ID;
  note?: string;
  source: EntrySource;
  recurringId?: ID;
  postedForMonth?: ISOMonth;
  chapterId: ID; // 'current' in v1
}

export interface Recurring {
  id: ID;
  label: string;
  amount: number; // cents, signed
  categoryId: ID;
  accountId: ID;
  dayOfMonth: number; // 1..28; 29-31 clamp to last day
  startMonth: ISOMonth;
  endMonth?: ISOMonth;
}

export interface Category {
  id: ID;
  label: string;
  kind: "income" | "expense";
  color?: string;
  archived: boolean;
}

export interface Account {
  id: ID;
  label: string;
  kind: "giro" | "cash" | "savings" | "credit";
  archived: boolean;
}

export interface Snapshot {
  id: ID;
  date: ISODate;
  accountId: ID;
  balance: number; // cents, signed
}
