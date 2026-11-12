export type Txn = { id: string; at: Date; amountMinor: number; currency: string; kind: "payment" | "refund" };
export type Money = Record<string, number>;
export type MonthPoint = { month: string /* YYYY-MM */; totals: Money; partial: boolean };
export type ProductRevenue = { productId: string; last30: Money; months: MonthPoint[]; updatedAt: string };
