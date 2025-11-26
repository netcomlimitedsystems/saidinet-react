import React, { useState } from 'react';
import { Wifi, Lock, Smartphone, CheckCircle, CreditCard, Signal, Clock } from 'lucide-react';
import { Button } from './UiComponents';
import { WifiPlan } from '../types';

interface CaptivePortalProps {
  onLogin: (code: string) => void;
  plans: WifiPlan[];
}

export const CaptivePortal: React.FC<CaptivePortalProps> = ({ onLogin, plans }) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setIsConnecting(true);
    // Simulate network authentication delay
    setTimeout(() => {
      onLogin(voucherCode);
      setIsConnecting(false);
    }, 1500);
  };

  const handleBuyPlan = () => {
    if(!activePlanId) return;
    const plan = plans.find(p => p.id === activePlanId);
    if(plan) {
        alert(`Redirecting to payment gateway for ${plan.name} ($${plan.price})`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
          alt="Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/90 to-indigo-950/40"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 mb-6 transform hover:scale-105 transition-transform duration-300">
            <Wifi className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">SaidiNet</h1>
          <p className="text-indigo-200 text-lg font-medium">Premium High-Speed Wi-Fi Access</p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Tabs / Toggle (Visual only for now) */}
          <div className="flex border-b border-white/10">
            <div className="flex-1 py-4 text-center text-white font-semibold border-b-2 border-indigo-500 bg-white/5">
              Access
            </div>
            <div className="flex-1 py-4 text-center text-gray-400 font-medium hover:text-white cursor-not-allowed">
              Help
            </div>
          </div>

          <div className="p-8">
            
            {/* Plans List (Moved to Top) */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {plans.map((plan) => {
                const isActive = activePlanId === plan.id;
                return (
                  <div 
                    key={plan.id}
                    onClick={() => setActivePlanId(plan.id)}
                    className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 group ${
                      isActive 
                        ? 'bg-indigo-900/30 border-indigo-500 shadow-md shadow-indigo-900/20' 
                        : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className={`text-base font-bold ${isActive ? 'text-white' : 'text-gray-200'}`}>
                              {plan.name}
                            </h3>
                            {plan.dataAllowance === 'Unlimited' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                                    BEST VALUE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center text-xs text-gray-400">
                                <Clock className="w-3 h-3 mr-1" /> {plan.duration}
                            </span>
                            <span className="flex items-center text-xs text-gray-400">
                                <Signal className="w-3 h-3 mr-1" /> {plan.speedLimit}
                            </span>
                             <span className="flex items-center text-xs text-gray-400">
                                <Smartphone className="w-3 h-3 mr-1" /> {plan.devices} Dev
                            </span>
                        </div>
                      </div>
                      <div className="text-right pl-4">
                        <span className="block text-xl font-bold text-white">${plan.price}</span>
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    <div className={`absolute inset-0 border-2 rounded-xl pointer-events-none transition-opacity duration-200 ${isActive ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-0'}`}></div>
                    
                    {isActive && (
                      <div className="absolute top-1/2 -translate-y-1/2 -right-3 bg-indigo-500 rounded-full p-1 shadow-lg transform translate-x-0 transition-transform">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Purchase Button Area */}
            <div className={`mt-6 transition-all duration-300 ${activePlanId ? 'opacity-100 transform translate-y-0' : 'opacity-50 transform translate-y-2 pointer-events-none'}`}>
               <Button 
               className="w-full !bg-emerald-600 hover:!bg-emerald-500 py-3.5 text-base font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
               onClick={handleBuyPlan}
               disabled={!activePlanId}
             >
               <CreditCard className="w-5 h-5" />
               Purchase Plan
             </Button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-900/0 backdrop-blur-xl text-gray-400 font-medium">
                  Or connect with a voucher code
                </span>
              </div>
            </div>

            {/* Voucher Form (Moved to Bottom) */}
            <form onSubmit={handleConnect} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="voucher" className="block text-sm font-medium text-gray-300">
                  Voucher Code
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    id="voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                    placeholder="Enter your access code"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full !bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 text-lg font-bold shadow-lg shadow-indigo-500/25 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" 
                isLoading={isConnecting}
              >
                Connect Now
              </Button>
            </form>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Need help? Contact support at <a href="#" className="text-indigo-400 hover:text-indigo-300">support@saidinet.com</a>
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-400">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};