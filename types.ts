
export interface WifiPlan {
  id: string;
  name: string;
  price: number;
  duration: string; // e.g., "1 Hour", "1 Day"
  speedLimit: string; // e.g., "5 Mbps"
  dataAllowance: string; // e.g., "Unlimited", "10 GB"
  description: string;
  devices: number;
}

export interface ActiveSession {
  id: string;
  userId?: string; // Optional link to registered user
  macAddress: string;
  ipAddress: string;
  voucherCode: string;
  startTime: string;
  expiresAt: string; // ISO 8601 string
  dataUsage: number; // in MB
  planName: string;
}

export interface RevenueData {
  date: string;
  amount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedPlanId?: string;
  status: 'Active' | 'Inactive';
  joinDate: string;
}

export interface BillingRecord {
  id: string;
  userId: string;
  planName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed';
  invoiceId: string;
}

export interface Voucher {
  id: string;
  code: string;
  planName: string;
  duration: string;
  dataAllowance: string;
  status: 'Unused' | 'Active' | 'Used';
  createdAt: string;
}

export enum ViewState {
  PORTAL = 'PORTAL',
  ADMIN = 'ADMIN',
}

export enum AdminTab {
  DASHBOARD = 'DASHBOARD',
  PLANS = 'PLANS',
  VOUCHERS = 'VOUCHERS',
  USERS = 'USERS',
  AI_INSIGHTS = 'AI_INSIGHTS'
}
