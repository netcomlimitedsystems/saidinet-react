
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Ticket, 
  Wifi, 
  Users, 
  TrendingUp, 
  Plus, 
  LogOut, 
  Sparkles,
  RefreshCw,
  Search,
  FileText,
  History,
  Trash2,
  AlertTriangle,
  HelpCircle,
  Edit,
  Monitor,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Button, Card, Badge, Modal, Tooltip, Switch } from './UiComponents';
import { WifiPlan, ActiveSession, RevenueData, AdminTab, User, BillingRecord, Voucher } from '../types';
import { generatePlanMarketing, analyzeRevenueData } from '../services/geminiService';

// --- Sub-Components ---

const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiry = new Date(targetDate);
  const diffMs = expiry.getTime() - now.getTime();

  let label = 'Expired';
  let colorClass = 'text-gray-500 bg-gray-100 border border-gray-200';
  let Icon = XCircle;
  let animate = '';

  if (diffMs > 0) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (days > 0) {
      label = `${days}d ${hours}h ${minutes}m`;
    } else {
      label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (diffMs < 5 * 60 * 1000) {
        colorClass = 'text-red-700 bg-red-100 border border-red-200 font-extrabold shadow-sm';
        Icon = AlertTriangle;
        animate = 'animate-pulse';
        // Add CRITICAL text only when space permits, effectively relying on color/icon mostly but distinct style
    } else if (diffMs < 30 * 60 * 1000) {
        colorClass = 'text-yellow-700 bg-yellow-100 border border-yellow-200';
        Icon = Clock;
    } else {
        colorClass = 'text-emerald-700 bg-emerald-100 border border-emerald-200';
        Icon = CheckCircle;
    }
  }

  return (
    <div 
      className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md w-fit min-w-[110px] justify-center transition-all ${colorClass} ${animate}`}
      title={`Expires: ${expiry.toLocaleString()}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="font-mono tabular-nums">{label}</span>
    </div>
  );
};

// --- Main Component ---

interface AdminDashboardProps {
  onLogout: () => void;
  plans: WifiPlan[];
  onAddPlan: (plan: WifiPlan) => void;
  onDeletePlan: (id: string) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  billingRecords: BillingRecord[];
  setBillingRecords: React.Dispatch<React.SetStateAction<BillingRecord[]>>;
  activeSessions: ActiveSession[];
  onAddSession: (session: ActiveSession) => void;
  onRemoveSession: (id: string) => void;
  onExtendSession: (id: string) => void;
  onRefreshSessions: () => void;
  vouchers: Voucher[];
  onGenerateVouchers: (count: number, planName: string, duration: string, dataAllowance: string) => void;
}

const MOCK_REVENUE: RevenueData[] = [
  { date: 'Mon', amount: 120 },
  { date: 'Tue', amount: 145 },
  { date: 'Wed', amount: 132 },
  { date: 'Thu', amount: 190 },
  { date: 'Fri', amount: 240 },
  { date: 'Sat', amount: 310 },
  { date: 'Sun', amount: 280 },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onLogout, 
  plans, 
  onAddPlan, 
  onDeletePlan,
  users, 
  setUsers,
  billingRecords, 
  setBillingRecords,
  activeSessions,
  onAddSession,
  onRemoveSession,
  onExtendSession,
  onRefreshSessions,
  vouchers,
  onGenerateVouchers
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.DASHBOARD);
  
  // Plan Creation State
  const [newPlan, setNewPlan] = useState<Partial<WifiPlan>>({
    name: '',
    price: 0,
    duration: '',
    speedLimit: '',
    dataAllowance: 'Unlimited',
    description: '',
    devices: 1
  });
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [durationError, setDurationError] = useState('');
  
  // Delete Plan State
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // User Management State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserBilling, setSelectedUserBilling] = useState<BillingRecord[] | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    assignedPlanId: '',
    status: 'Active'
  });

  // Session State
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [sessionToDisconnect, setSessionToDisconnect] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualSession, setManualSession] = useState({
    userId: '',
    macAddress: '',
    ipAddress: '',
    planId: ''
  });

  // Voucher State
  const [voucherTab, setVoucherTab] = useState<'SESSIONS' | 'GENERATOR'>('SESSIONS');
  const [voucherConfig, setVoucherConfig] = useState({
    quantity: 10,
    planId: '',
    customDuration: '',
    customData: ''
  });

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // --- Handlers ---

  const handleGenerateCopy = async () => {
    if (!newPlan.name || !newPlan.duration) return;
    setIsGeneratingCopy(true);
    const copy = await generatePlanMarketing(newPlan.name, newPlan.duration, newPlan.price || 0);
    setNewPlan({ ...newPlan, description: copy });
    setIsGeneratingCopy(false);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();

    // Final Validation check
    if (newPlan.duration && !/^\d+\s+(Hour|Hours|Day|Days|Week|Weeks|Month|Months)$/i.test(newPlan.duration)) {
      setDurationError('Invalid format');
      return;
    }

    if (newPlan.name && newPlan.price !== undefined && !durationError) {
      onAddPlan({
        id: Date.now().toString(),
        name: newPlan.name,
        price: newPlan.price,
        duration: newPlan.duration || '1 Hour',
        speedLimit: newPlan.speedLimit || '5 Mbps',
        dataAllowance: newPlan.dataAllowance || 'Unlimited',
        description: newPlan.description || '',
        devices: newPlan.devices || 1
      });
      setNewPlan({ name: '', price: 0, duration: '', speedLimit: '', dataAllowance: 'Unlimited', description: '', devices: 1 });
      setDurationError('');
    }
  };

  const handleDeleteClick = (id: string) => {
    setPlanToDelete(id);
  };

  const confirmDeletePlan = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete);
      setPlanToDelete(null);
    }
  };

  const confirmDisconnectSession = () => {
    if (sessionToDisconnect) {
      onRemoveSession(sessionToDisconnect);
      setSessionToDisconnect(null);
    }
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshSessions();
    setTimeout(() => setIsRefreshing(false), 750);
  };

  const handleToggleUserStatus = (userId: string, currentStatus: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: currentStatus === 'Active' ? 'Inactive' : 'Active' } : u
    ));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      const createdUser: User = {
        id: `u-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        assignedPlanId: newUser.assignedPlanId,
        status: (newUser.status as 'Active' | 'Inactive') || 'Active',
        joinDate: new Date().toISOString().split('T')[0]
      };
      setUsers([...users, createdUser]);
      setIsAddUserModalOpen(false);
      setNewUser({ name: '', email: '', phone: '', assignedPlanId: '', status: 'Active' });
    }
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setIsEditUserModalOpen(false);
      setEditingUser(null);
    }
  };

  const handleViewBilling = (userId: string) => {
    const userBills = billingRecords.filter(b => b.userId === userId);
    setSelectedUserBilling(userBills);
  };

  const handleManualSessionAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === manualSession.planId);
    if (plan) {
      // Calculate expiresAt based on plan duration
      const now = new Date();
      if (plan.duration.toLowerCase().includes('hour')) {
        const hours = parseInt(plan.duration) || 1;
        now.setHours(now.getHours() + hours);
      } else if (plan.duration.toLowerCase().includes('day')) {
        const days = parseInt(plan.duration) || 1;
        now.setDate(now.getDate() + days);
      } else {
         now.setHours(now.getHours() + 1); // Default
      }

      onAddSession({
        id: `s-${Date.now()}`,
        userId: manualSession.userId,
        macAddress: manualSession.macAddress,
        ipAddress: manualSession.ipAddress,
        voucherCode: 'MANUAL',
        startTime: new Date().toLocaleTimeString(),
        expiresAt: now.toISOString(),
        dataUsage: 0,
        planName: plan.name
      });
      setIsAddSessionModalOpen(false);
      setManualSession({ userId: '', macAddress: '', ipAddress: '', planId: '' });
    }
  };

  const handleVoucherGeneration = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === voucherConfig.planId);
    if (plan) {
      onGenerateVouchers(
        voucherConfig.quantity,
        plan.name,
        voucherConfig.customDuration || plan.duration,
        voucherConfig.customData || plan.dataAllowance
      );
      // Reset optional fields
      setVoucherConfig({ ...voucherConfig, customDuration: '', customData: '' });
      alert(`Generated ${voucherConfig.quantity} vouchers for ${plan.name}`);
    }
  };

  const getAiInsights = async () => {
    setIsLoadingInsight(true);
    const insight = await analyzeRevenueData(MOCK_REVENUE);
    setAiInsight(insight);
    setIsLoadingInsight(false);
  };

  // --- Derived State ---

  const filteredSessions = activeSessions.filter(session => 
    session.macAddress.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
    session.ipAddress.includes(sessionSearchQuery) ||
    session.voucherCode.toLowerCase().includes(sessionSearchQuery.toLowerCase())
  );

  const getActiveSessionCountForUser = (userId: string) => {
    return activeSessions.filter(s => s.userId === userId).length;
  };

  const getPlanDeviceLimit = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.devices : 1;
  };

  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <h3 className="text-2xl font-bold text-gray-900">{activeSessions.length}</h3>
          </div>
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Daily Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">$245.00</h3>
          </div>
          <div className="bg-green-100 p-2 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Active Plans</p>
            <h3 className="text-2xl font-bold text-gray-900">{plans.length}</h3>
          </div>
          <div className="bg-purple-100 p-2 rounded-lg">
            <Wifi className="w-6 h-6 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">System Health</p>
            <h3 className="text-2xl font-bold text-gray-900">99.9%</h3>
          </div>
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Overview</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
           <p className="text-sm text-gray-500">Manage registered users and their billing</p>
        </div>
        <Button onClick={() => setIsAddUserModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                 const plan = plans.find(p => p.id === user.assignedPlanId);
                 return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3">
                          {user.name.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {plan.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Badge type={user.status === 'Active' ? 'success' : 'error'}>{user.status}</Badge>
                        <Switch 
                          checked={user.status === 'Active'} 
                          onChange={() => handleToggleUserStatus(user.id, user.status)} 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.joinDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewBilling(user.id)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Billing"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditUserModal(user)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderPlans = () => (
    <div className="space-y-8">
      {/* Existing Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Plans & Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden group">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1 space-x-2">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {plan.duration}</span>
                      <span>•</span>
                      <span className="flex items-center"><Wifi className="w-3 h-3 mr-1"/> {plan.speedLimit}</span>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-indigo-600">${plan.price}</span>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                  "{plan.description}"
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                   <Badge type="info">{plan.dataAllowance}</Badge>
                   <Badge type="info">{plan.devices} Device{plan.devices > 1 ? 's' : ''}</Badge>
                </div>

                <div className="mt-6 flex justify-between items-center border-t pt-4">
                  <span className="text-xs text-gray-400">ID: {plan.id}</span>
                  <button 
                    onClick={() => handleDeleteClick(plan.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500 absolute bottom-0"></div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create New Plan Form */}
      <Card className="p-6 border-indigo-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Plus className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Create New Plan</h2>
        </div>
        
        <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700">
                Plan Name
                <Tooltip content="The visible name of the plan for users (e.g., 'Gold Package')."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                placeholder="e.g. VIP Gamer Pack"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700">
                  Duration
                  <Tooltip content="How long the internet access lasts. Use format 'Number Unit' (e.g., '1 Hour', '24 Hours', '7 Days')."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
                </label>
                <input
                  type="text"
                  className={`mt-1 block w-full rounded-md border shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 ${durationError ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g. 24 Hours, 7 Days"
                  value={newPlan.duration}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPlan({ ...newPlan, duration: val });
                    if (val && !/^\d+\s+(Hour|Hours|Day|Days|Week|Weeks|Month|Months)$/i.test(val)) {
                      setDurationError('Format: "Number Unit" (e.g. 2 Days)');
                    } else {
                      setDurationError('');
                    }
                  }}
                />
                {durationError && <p className="text-xs text-red-500 mt-1">{durationError}</p>}
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700">
                  Price ($)
                  <Tooltip content="Cost of the plan. Set to 0 for free plans."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    Data Allowance
                    <Tooltip content="Total data transfer allowed before throttle or cutoff."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
                  </label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                    value={newPlan.dataAllowance}
                    onChange={(e) => setNewPlan({ ...newPlan, dataAllowance: e.target.value })}
                  >
                    <option value="Unlimited">Unlimited</option>
                    <option value="500 MB">500 MB</option>
                    <option value="1 GB">1 GB</option>
                    <option value="5 GB">5 GB</option>
                    <option value="10 GB">10 GB</option>
                    <option value="100 GB">100 GB</option>
                  </select>
               </div>
               <div>
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    Device Limit
                    <Tooltip content="Max concurrent active sessions for a user on this plan."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                    value={newPlan.devices}
                    onChange={(e) => setNewPlan({ ...newPlan, devices: parseInt(e.target.value) })}
                  />
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700">
                Speed Limit
                <Tooltip content="Max download/upload speed (e.g., '10 Mbps')."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                placeholder="e.g. 10 Mbps"
                value={newPlan.speedLimit}
                onChange={(e) => setNewPlan({ ...newPlan, speedLimit: e.target.value })}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  Marketing Description
                  <Tooltip content="Sales copy shown on the captive portal. Use the 'Generate Copy' button to create with AI."><HelpCircle className="w-3 h-3 ml-1 text-gray-400" /></Tooltip>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCopy}
                  disabled={!newPlan.name || !newPlan.duration || isGeneratingCopy}
                  className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isGeneratingCopy ? 'Generating...' : 'Generate Copy'}
                </button>
              </div>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 h-24"
                placeholder="AI-generated description will appear here..."
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={!!durationError}>Create Plan</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );

  const renderVouchers = () => (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setVoucherTab('SESSIONS')}
            className={`${voucherTab === 'SESSIONS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Monitor className="w-4 h-4 mr-2"/>
            Active Sessions
          </button>
          <button
            onClick={() => setVoucherTab('GENERATOR')}
            className={`${voucherTab === 'GENERATOR' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Ticket className="w-4 h-4 mr-2"/>
            Voucher Generator
          </button>
        </nav>
      </div>

      {voucherTab === 'SESSIONS' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search MAC, IP, Voucher..."
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleRefreshClick} disabled={isRefreshing}>
                 <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                 Refresh
              </Button>
              <Button onClick={() => setIsAddSessionModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Manual Connect
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher/User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => {
                    return (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">{session.macAddress}</div>
                          <div className="text-xs text-gray-500">{session.ipAddress}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {session.voucherCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.planName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.dataUsage} MB</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CountdownTimer targetDate={session.expiresAt} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                              onClick={() => onExtendSession(session.id)}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors font-medium text-sm flex items-center"
                              title="Extend Session by 1 Hour"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Extend
                            </button>
                            <button 
                              onClick={() => setSessionToDisconnect(session.id)}
                              className="text-red-600 hover:text-red-900 transition-colors font-medium text-sm flex items-center"
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Disconnect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No active sessions found matching "{sessionSearchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {voucherTab === 'GENERATOR' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Generate Vouchers</h3>
            <form onSubmit={handleVoucherGeneration} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                 <input 
                   type="number" 
                   min="1" 
                   max="100" 
                   className="w-full border rounded-md p-2"
                   value={voucherConfig.quantity}
                   onChange={e => setVoucherConfig({...voucherConfig, quantity: parseInt(e.target.value)})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Plan Template</label>
                 <select 
                   className="w-full border rounded-md p-2"
                   value={voucherConfig.planId}
                   onChange={e => setVoucherConfig({...voucherConfig, planId: e.target.value})}
                   required
                 >
                   <option value="">Select a plan...</option>
                   {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Duration Override (Opt)</label>
                 <input 
                   type="text" 
                   className="w-full border rounded-md p-2" 
                   placeholder="e.g. 48 Hours"
                   value={voucherConfig.customDuration}
                   onChange={e => setVoucherConfig({...voucherConfig, customDuration: e.target.value})}
                 />
              </div>
              <Button type="submit">Generate Batch</Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-700">Recent Vouchers</h3>
               <Button variant="secondary" className="text-sm py-1">
                 <Printer className="w-4 h-4 mr-2" /> Print Batch
               </Button>
             </div>
             <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-50 sticky top-0">
                     <tr>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {vouchers.slice().reverse().map(v => (
                       <tr key={v.id}>
                         <td className="px-6 py-3 font-mono font-bold text-indigo-600">{v.code}</td>
                         <td className="px-6 py-3 text-sm">{v.planName}</td>
                         <td className="px-6 py-3 text-sm">{v.duration}</td>
                         <td className="px-6 py-3">
                           <Badge type={v.status === 'Unused' ? 'success' : v.status === 'Active' ? 'warning' : 'error'}>
                             {v.status}
                           </Badge>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderAiInsights = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-500" />
          Gemini AI Insights
        </h2>
        <p className="text-gray-500 mt-2">Intelligent analysis of your network performance and revenue.</p>
      </div>

      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 rounded-full">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Revenue Optimization Strategy</h3>
            <div className="prose prose-indigo max-w-none text-gray-600">
              {aiInsight ? (
                <p className="leading-relaxed">{aiInsight}</p>
              ) : (
                <p className="text-gray-400 italic">Click the button below to generate AI insights based on your recent data...</p>
              )}
            </div>
            <div className="mt-6">
              <Button onClick={getAiInsights} isLoading={isLoadingInsight}>
                {aiInsight ? <span className="flex items-center"><RefreshCw className="w-4 h-4 mr-2"/> Refresh Analysis</span> : 'Generate Insights'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 text-indigo-600">
            <Wifi className="w-8 h-8" />
            <span className="text-xl font-bold text-gray-900">SaidiNet</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Admin Panel</p>
        </div>
        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab(AdminTab.DASHBOARD)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === AdminTab.DASHBOARD ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab(AdminTab.PLANS)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === AdminTab.PLANS ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="w-5 h-5 mr-3" />
            Plans & Pricing
          </button>
          <button
            onClick={() => setActiveTab(AdminTab.VOUCHERS)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === AdminTab.VOUCHERS ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Ticket className="w-5 h-5 mr-3" />
            Vouchers & Sessions
          </button>
          <button
            onClick={() => setActiveTab(AdminTab.USERS)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === AdminTab.USERS ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Users className="w-5 h-5 mr-3" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab(AdminTab.AI_INSIGHTS)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === AdminTab.AI_INSIGHTS ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Sparkles className="w-5 h-5 mr-3" />
            AI Insights
          </button>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        {activeTab === AdminTab.DASHBOARD && renderDashboard()}
        {activeTab === AdminTab.PLANS && renderPlans()}
        {activeTab === AdminTab.VOUCHERS && renderVouchers()}
        {activeTab === AdminTab.USERS && renderUsers()}
        {activeTab === AdminTab.AI_INSIGHTS && renderAiInsights()}
      </div>

      {/* --- MODALS --- */}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!planToDelete} 
        onClose={() => setPlanToDelete(null)}
        title="Confirm Deletion"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-500 mb-6">Are you sure you want to delete this plan? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
             <Button variant="secondary" onClick={() => setPlanToDelete(null)}>Cancel</Button>
             <Button variant="danger" onClick={confirmDeletePlan}>Delete Plan</Button>
          </div>
        </div>
      </Modal>

      {/* Disconnect Session Confirmation Modal */}
      <Modal 
        isOpen={!!sessionToDisconnect} 
        onClose={() => setSessionToDisconnect(null)}
        title="Disconnect Session"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Wifi className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-500 mb-6">Are you sure you want to forcibly disconnect this session? The user will lose internet access immediately.</p>
          <div className="flex justify-center gap-3">
             <Button variant="secondary" onClick={() => setSessionToDisconnect(null)}>Cancel</Button>
             <Button variant="danger" onClick={confirmDisconnectSession}>Disconnect User</Button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Register New User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700">Full Name</label>
             <input type="text" className="w-full border rounded-md p-2 mt-1" required 
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700">Email Address</label>
             <input type="email" className="w-full border rounded-md p-2 mt-1" required 
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700">Phone Number</label>
             <input type="tel" className="w-full border rounded-md p-2 mt-1" 
                value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700">Initial Plan</label>
             <select className="w-full border rounded-md p-2 mt-1" 
                value={newUser.assignedPlanId} onChange={e => setNewUser({...newUser, assignedPlanId: e.target.value})}>
                <option value="">None</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
           </div>
           <Button type="submit" className="w-full">Create Account</Button>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title="Edit User Details"
      >
        {editingUser && (
          <form onSubmit={handleUpdateUser} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700">Full Name</label>
               <input type="text" className="w-full border rounded-md p-2 mt-1" required 
                  value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Email Address</label>
               <input type="email" className="w-full border rounded-md p-2 mt-1" required 
                  value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Phone Number</label>
               <input type="tel" className="w-full border rounded-md p-2 mt-1" 
                  value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Assigned Plan</label>
               <select className="w-full border rounded-md p-2 mt-1" 
                  value={editingUser.assignedPlanId || ''} onChange={e => setEditingUser({...editingUser, assignedPlanId: e.target.value})}>
                  <option value="">None</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
             </div>
             <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        )}
      </Modal>

      {/* Billing History Modal */}
      <Modal
        isOpen={!!selectedUserBilling}
        onClose={() => setSelectedUserBilling(null)}
        title="Billing History"
      >
        <div className="space-y-4">
           {selectedUserBilling && selectedUserBilling.length > 0 ? (
             <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Invoice</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Plan</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Status</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedUserBilling.map(bill => (
                      <tr key={bill.id}>
                        <td className="px-4 py-2 text-xs font-mono">{bill.invoiceId}</td>
                        <td className="px-4 py-2 text-sm">{bill.planName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{bill.date}</td>
                        <td className="px-4 py-2 text-sm">
                          <Badge type={bill.status === 'Paid' ? 'success' : bill.status === 'Pending' ? 'warning' : 'error'}>
                            {bill.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-bold">${bill.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           ) : (
             <p className="text-center text-gray-500 py-4">No billing records found.</p>
           )}
           <div className="flex justify-end">
             <Button variant="secondary" onClick={() => setSelectedUserBilling(null)}>Close</Button>
           </div>
        </div>
      </Modal>

       {/* Manual Add Session Modal */}
       <Modal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        title="Manual Session Authorization"
      >
        <form onSubmit={handleManualSessionAdd} className="space-y-4">
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
            <p className="text-sm text-yellow-800 flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              This will forcefully create an authenticated session for the specified device.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">User Account (Optional)</label>
            <select 
              className="w-full border rounded-md p-2 mt-1"
              value={manualSession.userId}
              onChange={e => setManualSession({...manualSession, userId: e.target.value})}
            >
              <option value="">Guest (No User)</option>
              {users.map(u => {
                 const activeCount = getActiveSessionCountForUser(u.id);
                 const limit = u.assignedPlanId ? getPlanDeviceLimit(u.assignedPlanId) : 1;
                 const isFull = activeCount >= limit;
                 return (
                   <option key={u.id} value={u.id} disabled={isFull}>
                     {u.name} ({activeCount}/{limit} Active) {isFull ? '- LIMIT REACHED' : ''}
                   </option>
                 );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">MAC Address</label>
            <input 
              type="text" 
              className="w-full border rounded-md p-2 mt-1 font-mono uppercase" 
              placeholder="00:11:22:33:44:55"
              required 
              value={manualSession.macAddress}
              onChange={e => setManualSession({...manualSession, macAddress: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">IP Address</label>
            <input 
              type="text" 
              className="w-full border rounded-md p-2 mt-1 font-mono" 
              placeholder="192.168.1.X"
              required 
              value={manualSession.ipAddress}
              onChange={e => setManualSession({...manualSession, ipAddress: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Authorize With Plan</label>
            <select 
              className="w-full border rounded-md p-2 mt-1"
              required
              value={manualSession.planId}
              onChange={e => setManualSession({...manualSession, planId: e.target.value})}
            >
              <option value="">Select Plan...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.duration})</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full">Authorize Device</Button>
        </form>
      </Modal>

    </div>
  );
};
