import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X } from 'lucide-react';

interface AuthScreenProps {
    onClose: () => void;
}

export function AuthScreen({ onClose }: AuthScreenProps) {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // UI Feedback States
    const [emailErrorBg, setEmailErrorBg] = useState(false);
    const [emailSuccessBg, setEmailSuccessBg] = useState(false);
    const [passwordErrorBg, setPasswordErrorBg] = useState(false);
    const [approvalChannel, setApprovalChannel] = useState<any>(null);
    const [approvalInterval, setApprovalInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (approvalChannel) {
                supabase.removeChannel(approvalChannel);
            }
            if (approvalInterval) {
                clearInterval(approvalInterval);
            }
        };
    }, [approvalChannel, approvalInterval]);

    const handleAuthSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        try {
            if (isRegisterMode) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data?.user?.identities && data.user.identities.length === 0) {
                    // Check if approved or pending
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_approved')
                        .eq('id', data.user.id)
                        .single();

                    if (profile?.is_approved) {
                        throw new Error('already_registered_approved');
                    } else {
                        throw new Error('already_registered_pending');
                    }
                }

                // 가입 성공 시 피드백
                const originalEmail = email;
                setEmail('사용승인을 요청했습니다.');
                setEmailSuccessBg(true);

                // 실시간 승인 대기
                if (data?.user?.id) {
                    const channel = supabase.channel(`public:profiles:id=eq.${data.user.id}`)
                        .on('postgres_changes', {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${data.user.id}`
                        }, (payload) => {
                            if (payload.new.is_approved) {
                                // 1. 승인 직후 안내 문구 표시
                                setEmail('환영합니다!');

                                // 2. 5초 대기 후 깨끗하게 리셋 및 로그인 창 이동
                                setTimeout(() => {
                                    setEmailSuccessBg(false);
                                    setEmail('');
                                    setIsRegisterMode(false);
                                    setPassword('');
                                    supabase.removeChannel(channel);
                                    setApprovalChannel(null);
                                    setApprovalInterval((prev) => {
                                        if (prev) clearInterval(prev);
                                        return null;
                                    });
                                }, 5000);
                            }
                        })
                        .subscribe();
                    setApprovalChannel(channel);

                    let pollCount = 0;
                    const maxPolls = 24; // 120초(2분) / 5초 = 24회

                    // 백업: 5초 간격 폴링 (Fallback) 최대 2분 유지
                    const intervalId = setInterval(async () => {
                        pollCount++;
                        if (pollCount > maxPolls) {
                            clearInterval(intervalId);
                            setApprovalInterval(null);
                            return;
                        }

                        try {
                            const { data: checkProfile } = await supabase
                                .from('profiles')
                                .select('is_approved')
                                .eq('id', data.user.id)
                                .single();

                            if (checkProfile?.is_approved) {
                                clearInterval(intervalId);
                                supabase.removeChannel(channel);

                                // 1. 승인 직후 안내 문구 표시
                                setEmail('환영합니다!');

                                // 2. 5초 대기 후 깨끗하게 리셋 및 로그인 창 이동
                                setTimeout(() => {
                                    setEmailSuccessBg(false);
                                    setEmail('');
                                    setIsRegisterMode(false);
                                    setPassword('');
                                    setApprovalChannel(null);
                                    setApprovalInterval(null);
                                }, 5000);
                            }
                        } catch (err) {
                            console.error('Polling check failed', err);
                        }
                    }, 5000);
                    setApprovalInterval(intervalId);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();
            }
        } catch (err: any) {
            const msgText = err.message || '인증 오류가 발생했습니다.';
            const originalEmail = email;

            if (isRegisterMode && msgText.includes('already_registered_approved')) {
                setEmail('이미 등록된 계정입니다.');
                setEmailErrorBg(true);
                setTimeout(() => { setEmail(originalEmail); setEmailErrorBg(false); }, 6000);
            } else if (isRegisterMode && (msgText.includes('already_registered_pending') || msgText.toLowerCase().includes('already registered'))) {
                setEmail('중복된 계정입니다.');
                setEmailErrorBg(true);
                setTimeout(() => { setEmail(originalEmail); setEmailErrorBg(false); }, 2000);
            } else if (!isRegisterMode && msgText.toLowerCase().includes('invalid login credentials')) {
                setEmailErrorBg(true);
                setPasswordErrorBg(true);
                setTimeout(() => {
                    setEmailErrorBg(false);
                    setPasswordErrorBg(false);
                }, 6000);
            } else {
                alert(`인증 실패: ${msgText}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
            });
            if (error) throw error;
        } catch (err: any) {
            alert(err.message || '소셜 로그인 중 오류가 발생했습니다.');
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert('비밀번호를 재설정할 이메일을 위 칸에 먼저 입력해 주세요.');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            alert('입력하신 이메일로 비밀번호 재설정 링크가 발송되었습니다.');
        } catch (err: any) {
            alert(err.message || '비밀번호 재설정 메일 발송에 실패했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="relative bg-white text-black rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl w-[90vw] max-w-[480px] max-h-[90dvh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
                style={{
                    // Use CSS transform to scale down on smaller screens, keeping padding/layout fully intact
                    transform: 'scale(min(1, calc(100vw / 480)))',
                    transformOrigin: 'center center'
                }}
            >
                <div className="relative w-full overflow-y-auto custom-scrollbar p-8 sm:p-10 md:p-14 flex flex-col items-start text-left">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100 z-10"
                    >
                        <X size={24} />
                    </button>

                    <div className="w-full flex flex-col items-start text-left">
                        <h2 className="font-display text-3xl sm:text-4xl mb-4">
                            Welcome, We are CAI
                        </h2>
                        <p className="font-mono text-xs sm:text-sm text-gray-500 mb-8 sm:mb-10">
                            Every person, thing, and space has its own shape. Now, Sign in to start making your own sketches.
                        </p>

                        <form onSubmit={handleAuthSubmit} className="w-full flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest pl-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="Example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-1 transition-all font-mono text-sm ${emailSuccessBg ? 'bg-blue-50 border-blue-500 text-blue-500 focus:border-blue-500 focus:ring-blue-500 placeholder-blue-300'
                                        : emailErrorBg ? 'bg-red-50 border-red-500 text-red-500 focus:border-red-500 focus:ring-red-500 placeholder-red-300'
                                            : 'bg-gray-50 border-gray-200 text-black focus:border-black focus:ring-black'
                                        }`}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest pl-1">Password</label>
                                <input
                                    type="password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-1 transition-all font-mono text-sm ${passwordErrorBg ? 'bg-red-50 border-red-500 text-red-500 focus:border-red-500 focus:ring-red-500 placeholder-red-300' : 'bg-gray-50 border-gray-200 text-black focus:border-black focus:ring-black'}`}
                                    required
                                />
                            </div>

                            {!isRegisterMode && (
                                <div className="w-full flex justify-end mt-1">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="font-mono text-xs text-black opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-4 w-full h-12 rounded-xl bg-black text-white font-display text-xl tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center relative shadow-lg"
                            >
                                <span className={`pt-1 ${isLoading ? 'opacity-0' : ''}`}>
                                    {isRegisterMode ? 'Sign up' : 'Sign in'}
                                </span>
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </button>
                        </form>

                        {!isRegisterMode && (
                            <div className="w-full mt-8 flex flex-col gap-4">
                                <div className="flex items-center gap-4 opacity-30">
                                    <div className="flex-1 h-px bg-black"></div>
                                    <span className="font-mono text-[10px] uppercase">Or sign in with</span>
                                    <div className="flex-1 h-px bg-black"></div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleOAuthLogin('google')}
                                        className="w-full h-10 sm:h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm relative"
                                    >
                                        <div className="absolute left-4 sm:left-6">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.545,6.477,2.545,12s4.476,10,10,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
                                            </svg>
                                        </div>
                                        <span className="font-display text-base sm:text-lg tracking-wide pt-1">Sign in with Google</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOAuthLogin('kakao')}
                                        className="w-full h-10 sm:h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm relative"
                                    >
                                        <div className="absolute left-4 sm:left-6 text-black">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.8 5.25 4.54 6.7-.16.57-.59 2.2-.68 2.53-.1.39.14.39.29.28.12-.08 1.94-1.34 2.74-1.93.98.2 2 .32 3.11.32 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                                            </svg>
                                        </div>
                                        <span className="font-display text-base sm:text-lg tracking-wide pt-1">Sign in with Kakao</span>
                                    </button>
                                </div>

                                <div className="mt-6 text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRegisterMode(true);
                                            setEmail('');
                                            setPassword('');
                                            setEmailErrorBg(false);
                                            setEmailSuccessBg(false);
                                            setPasswordErrorBg(false);
                                        }}
                                        className="font-mono text-xs text-gray-500 hover:text-black transition-colors"
                                    >
                                        Don't you have an account? <span className="underline underline-offset-4 text-black font-semibold">Sign up</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRegisterMode && (
                            <div className="mt-8 text-center text-xs font-mono">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegisterMode(false);
                                        setEmail('');
                                        setPassword('');
                                        setEmailErrorBg(false);
                                        setEmailSuccessBg(false);
                                        setPasswordErrorBg(false);
                                    }}
                                    className="text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                                >
                                    Go back to Sign In
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
