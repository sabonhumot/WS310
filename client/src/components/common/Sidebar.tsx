import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { SidebarProps } from '../../types';
import {
    LayoutDashboard,
    Users,
    History,
    Bell,
    Settings,
    PlusCircle,
    ChevronLeft,
    ChevronRight,
    X,
    LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LogoutModal from './LogoutModal';

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: PlusCircle, label: 'Bills', path: '/bills' },
        { icon: History, label: 'Activity', path: '/activity' },
        { icon: Users, label: 'Groups', path: '/groups' },
        { icon: Bell, label: 'Archive', path: '/archive' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar Container */}
            <aside 
                className={`fixed lg:sticky top-0 lg:top-24 left-0 h-screen lg:h-[calc(100vh-6rem)] bg-white border-r lg:border-none border-gray-100 z-40 transition-all duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'w-20' : 'w-64'}
                `}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between mb-8 lg:hidden">
                        <span className="text-xl font-bold text-gray-900 font-jakarta">Menu</span>
                        <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Collapse Toggle (Desktop) */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-4 w-6 h-6 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm text-gray-400 hover:text-indigo-600 transition-colors z-20"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                        <span className={`transition-opacity duration-200 whitespace-nowrap ${isCollapsed ? 'opacity-0 lg:hidden' : 'opacity-100'} ${isActive ? 'font-bold' : ''}`}>
                                            {item.label}
                                        </span>
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                                {item.label}
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}

                        {/* Logout Separator */}
                        <div className="my-4 border-t border-gray-50" />
                        
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all duration-200 group relative"
                        >
                            <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className={`transition-opacity duration-200 whitespace-nowrap ${isCollapsed ? 'opacity-0 lg:hidden' : 'opacity-100'}`}>
                                Log out
                            </span>
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    Log out
                                </div>
                            )}
                        </button>
                    </nav>

                    {/* Desktop Pro Box */}
                    {!isCollapsed && (
                        <div className="mt-auto p-4 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl text-white relative overflow-hidden group/pro shadow-lg shadow-indigo-100 hidden lg:block">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-6 -mt-6"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Pro</p>
                                <p className="text-xs font-bold mb-3 leading-tight">Export reports and sync</p>
                                <button className="w-full py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-black transition-all">
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <LogoutModal 
                isOpen={showLogoutModal} 
                onClose={() => setShowLogoutModal(false)} 
                onConfirm={handleLogout} 
            />
        </>
    );
};

export default Sidebar;
