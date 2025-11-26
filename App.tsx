
import React, { useState, useEffect } from 'react';
import { CaptivePortal } from './components/CaptivePortal';
import { AdminDashboard } from './components/AdminDashboard';
import { WifiPlan, ViewState, User, BillingRecord, ActiveSession, Voucher } from './types';
import { Lock } from 'lucide-react';
import { Button } from './components/UiComponents';

const INITIAL_PLANS: WifiPlan[] = [
  { id: '1', name: '1 Hour Flash', price: 0.50, duration: '1 Hour', speedLimit: '5 Mbps', dataAllowance: '500 MB', description: 'Quick access for checking emails and chat.', devices: 1 },
  { id: '2', name: 'Daily Unlimited', price: 2.00, duration: '24 Hours', speedLimit: '10 Mbps', dataAllowance: 'Unlimited', description: 'Stream movies and browse all day long.', devices: 2 },
  { id: '3', name: 'Weekly Pro', price: 10.00, duration: '7 Days', speedLimit: '20 Mbps', dataAllowance: '100 GB', description: 'Perfect for remote workers and heavy users.', devices: 3 },
];

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890', assignedPlanId: '2', status: 'Active', joinDate: '2023-11-15' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@example.com', phone: '+1987654321', assignedPlanId: '3', status: 'Active', joinDate: '2023-12-01' },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '+1122334455', status: 'Inactive', joinDate: '2024-01-10' },
];

const INITIAL_BILLING: BillingRecord[] = [
  { id: 'b1', userId: 'u1', planName: 'Daily Unlimited', amount: 2.00, date: '2024-02-15', status: 'Paid', invoiceId: 'INV-001' },
  { id: 'b2', userId: 'u1', planName: 'Daily Unlimited', amount: 2.00, date: '2024-02-14', status: 'Paid', invoiceId: 'INV-002' },
  { id: 'b3', userId: 'u2', planName: 'Weekly Pro', amount: 10.00, date: '2024-02-10', status: 'Paid', invoiceId: 'INV-003' },
  { id: 'b4', userId: 'u3', planName: '1 Hour Flash', amount: 0.50, date: '2024-01-10', status: 'Paid', invoiceId: 'INV-004' },
];

// Helper to create dynamic dates
const getRelativeDate = (minutesOffset: number) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesOffset);
  return date.toISOString();
};

const INITIAL_SESSIONS: ActiveSession[] = [
  { 
    id: '1', 
    userId: 'u1', 
    macAddress: 'A1:B2:C3:D4:E5:F6', 
    ipAddress: '192.168.88.10', 
    voucherCode: 'USER-LOGIN', 
    startTime: new Date(Date.now() - 60 * 60 * 1000).toLocaleTimeString(), // Started 1 hour ago
    expiresAt: getRelativeDate(23 * 60), // Expires in 23 hours (Daily plan)
    dataUsage: 150, 
    planName: 'Daily Unlimited' 
  },
  { 
    id: '2', 
    userId: 'u2', 
    macAddress: 'AA:BB:CC:DD:EE:FF', 
    ipAddress: '192.168.88.11', 
    voucherCode: 'USER-LOGIN', 
    startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleTimeString(), // Started 6 days ago
    expiresAt: getRelativeDate(24 * 60), // Expires in 1 day (Weekly plan)
    dataUsage: 450, 
    planName: 'Weekly Pro' 
  },
  { 
    id: '3', 
    macAddress: '11:22:33:44:55:66', 
    ipAddress: '192.168.88.12', 
    voucherCode: 'SN-7743', 
    startTime: new Date(Date.now() - 55 * 60 * 1000).toLocaleTimeString(), // Started 55 mins ago
    expiresAt: getRelativeDate(5), // Expires in 5 minutes (1 Hour plan) - Should trigger warning
    dataUsage: 25, 
    planName: '1 Hour Flash' 
  },
  { 
    id: '4', 
    userId: 'u2', 
    macAddress: '99:88:77:66:55:44', 
    ipAddress: '192.168.88.15', 
    voucherCode: 'USER-LOGIN', 
    startTime: new Date(Date.now() - 30 * 60 * 1000).toLocaleTimeString(), 
    expiresAt: getRelativeDate(6 * 24 * 60 + 23 * 60), // Plenty of time
    dataUsage: 890, 
    planName: 'Weekly Pro' 
  },
];

const INITIAL_VOUCHERS: Voucher[] = [
  { id: 'v1', code: 'SN-7743', planName: '1 Hour Flash', duration: '1 Hour', dataAllowance: '500 MB', status: 'Active', createdAt: '2024-02-20' },
  { id: 'v2', code: 'SN-9921', planName: 'Daily Unlimited', duration: '24 Hours', dataAllowance: 'Unlimited', status: 'Unused', createdAt: '2024-02-21' },
];

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.PORTAL);
  const [plans, setPlans] = useState<WifiPlan[]>(INITIAL_PLANS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>(INITIAL_BILLING);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(INITIAL_SESSIONS);
  const [vouchers, setVouchers] = useState<Voucher[]>(INITIAL_VOUCHERS);
  
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Session cleanup logic extracted for manual use
  const cleanupExpiredSessions = () => {
    const now = new Date();
    setActiveSessions(currentSessions => {
      const activeOnly = currentSessions.filter(session => {
        const expiryDate = new Date(session.expiresAt);
        return expiryDate > now;
      });

      // Only update state if we actually removed something to avoid unnecessary re-renders
      if (activeOnly.length !== currentSessions.length) {
        console.log(`Automatically disconnected ${currentSessions.length - activeOnly.length} expired session(s)`);
        return activeOnly;
      }
      return currentSessions;
    });
  };

  // Automatic cleanup of expired sessions
  useEffect(() => {
    const interval = setInterval(cleanupExpiredSessions, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Mock Admin Login Handler
  const handlePortalLogin = (code: string) => {
    if (code === 'admin') {
      setIsAdminLoginOpen(true); // Normally would authenticate here
    } else {
      alert(`Connecting with voucher: ${code}`);
      // In a real app, this would validate against a backend
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic secure check - in production this uses backend auth
    if (adminPassword === 'admin123') {
      setCurrentView(ViewState.ADMIN);
      setIsAdminLoginOpen(false);
      setAdminPassword('');
      setLoginError('');
    } else {
      setLoginError('Invalid administrator password');
      setAdminPassword('');
    }
  };

  const addPlan = (newPlan: WifiPlan) => {
    setPlans([...plans, newPlan]);
  };

  const deletePlan = (planId: string) => {
    setPlans(plans.filter(p => p.id !== planId));
  };

  const handleAddSession = (session: ActiveSession) => {
    setActiveSessions([session, ...activeSessions]);
  };

  const handleRemoveSession = (sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
  };

  const handleExtendSession = (sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(session => {
      if (session.id === sessionId) {
        // Add 1 hour (60 minutes)
        const currentExpiry = new Date(session.expiresAt);
        const now = new Date();
        // If expired, start from now, otherwise extend current expiry
        const baseTime = currentExpiry > now ? currentExpiry : now;
        baseTime.setMinutes(baseTime.getMinutes() + 60);
        return { ...session, expiresAt: baseTime.toISOString() };
      }
      return session;
    }));
  };

  const handleGenerateVouchers = (count: number, planName: string, duration: string, dataAllowance: string) => {
    const newVouchers: Voucher[] = [];
    const date = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < count; i++) {
      const code = `SN-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      newVouchers.push({
        id: `v-${Date.now()}-${i}`,
        code,
        planName,
        duration,
        dataAllowance,
        status: 'Unused',
        createdAt: date
      });
    }
    setVouchers([...newVouchers, ...vouchers]);
  };

  return (
    <div className="font-sans text-gray-900">
      {/* Admin Login Modal Overlay */}
      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Lock className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Admin Access</h2>
                <p className="text-xs text-gray-500">Secure Gateway</p>
              </div>
            </div>
            
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  type="password" 
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5 ${loginError ? 'border-red-500' : 'border-gray-300'}`} 
                  autoFocus 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                />
                {loginError && <p className="text-xs text-red-500 mt-1">{loginError}</p>}
                <p className="text-xs text-gray-400 mt-2">Demo Password: <strong className="font-mono text-gray-600">admin123</strong></p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => {
                    setIsAdminLoginOpen(false);
                    setLoginError('');
                    setAdminPassword('');
                  }} 
                >
                  Cancel
                </Button>
                <Button type="submit">Login</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentView === ViewState.PORTAL ? (
        <>
          <CaptivePortal onLogin={handlePortalLogin} plans={plans} />
          {/* Hidden trigger for admin demo */}
          <button 
            onClick={() => setIsAdminLoginOpen(true)}
            className="fixed bottom-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white/50 hover:text-white"
            title="Admin Login"
          >
            <Lock className="w-4 h-4" />
          </button>
        </>
      ) : (
        <AdminDashboard 
          onLogout={() => setCurrentView(ViewState.PORTAL)} 
          plans={plans}
          onAddPlan={addPlan}
          onDeletePlan={deletePlan}
          users={users}
          setUsers={setUsers}
          billingRecords={billingRecords}
          setBillingRecords={setBillingRecords}
          activeSessions={activeSessions}
          onAddSession={handleAddSession}
          onRemoveSession={handleRemoveSession}
          onExtendSession={handleExtendSession}
          onRefreshSessions={cleanupExpiredSessions}
          vouchers={vouchers}
          onGenerateVouchers={handleGenerateVouchers}
        />
      )}
    </div>
  );
}

export default App;
