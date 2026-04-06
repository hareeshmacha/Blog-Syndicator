import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles } from 'lucide-react';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Check your email for the login link or just log in if auto-confirm is enabled!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background data-color-mode='dark'">
            <div className="bg-surface border border-border p-8 rounded-xl max-w-md w-full shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary-600 p-3 rounded-xl mb-4">
                        <Sparkles size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome to Syndicator</h1>
                    <p className="text-slate-400 text-sm mt-2 text-center">
                        Log in to manage your cross-platform tech blog publishing workflow.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-300 mb-1 block text-left">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300 mb-1 block text-left">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
