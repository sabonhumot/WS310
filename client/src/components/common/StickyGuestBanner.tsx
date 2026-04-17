import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const StickyGuestBanner: React.FC = () => {
  const { guestUser, logoutGuest } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!guestUser?.expiry) return;

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, (guestUser.expiry - now) / 1000);
      setTimeLeft(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [guestUser]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  if (!guestUser) return null;

  const handleUpgrade = () => {
    navigate('/register');
  };

  const handleLogout = () => {
    logoutGuest();
    toast.success('Guest session ended');
  };

  return (
    <div className="sticky top-[70px] left-0 right-0 z-[90] h-[50px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/25">
      <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles size={13} />
          <div className="leading-none">
            <p className="font-black text-[10px] uppercase tracking-[0.14em]">Viewing as Guest</p>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span className="font-mono text-[10px] font-bold">
                {hours}h {minutes.toString().padStart(2, '0')}m remaining
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleUpgrade}
          className="px-4 py-1.5 bg-white text-indigo-600 font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl"
        >
          Upgrade Account
          <ArrowRight size={12} className="ml-1 inline" />
        </button>
      </div>
    </div>
  );
};

export default StickyGuestBanner;

