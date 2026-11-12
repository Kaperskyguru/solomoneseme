export type Txn = { id: string; at: Date; amountMinor: number; currency: string; kind: "payment" | "refund" };
export type Money = Record<string, number>;
export type MonthPoint = { month: string /* YYYY-MM */; totals: Money; partial: boolean };
export type RevenueBaseline = { asOf: string; totals: Money; note?: string };
export type ProductRevenue = { productId: string; last30: Money; /** All payments minus refunds, ever. Absent in old snapshots. */ lifetime: Money; months: MonthPoint[]; updatedAt: string };
