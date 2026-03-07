import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const VerifyPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link');
            return;
        }

        const verifyEmail = async () => {
            try {
                console.log('Attempting verification with token:', token);
                const response = await fetch(`http://localhost:5001/api/verify?token=${encodeURIComponent(token)}`);
                const data = await response.json();
                console.log('Verification response:', data);

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Network error. Please try again.');
            }
        };

        verifyEmail();
    }, [searchParams]);

    const handleStartJourney = () => {
        navigate('/login');
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/30">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying your email...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/30 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 text-center">
                {status === 'success' ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                        <p className="text-gray-600 mb-8">{message}</p>
                        <button
                            onClick={handleStartJourney}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Start Your Journey
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-2xl">✕</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                        <p className="text-gray-600 mb-8">{message}</p>
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyPage;