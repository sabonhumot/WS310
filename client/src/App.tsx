import type React from "react";
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar.tsx';
import LoginPage from './pages/LoginPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';

const App: React.FC = () => {
    return (
        <div className="min-h-screen">
            <Navbar />  
            <main>
                <Routes>
                    <Route path="/" element={
                        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                            <div className="text-center">
                                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
                                    Bill<span className="text-indigo-600 italic">Split</span>
                                </h1>
                            </div>
                        </section>
                    } />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Routes>
            </main>
        </div>
    );
};

export default App;

