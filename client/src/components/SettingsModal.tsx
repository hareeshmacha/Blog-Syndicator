import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, KeyRound } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function SettingsModal({ isOpen, onClose, userId }: SettingsModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [devtoKey, setDevtoKey] = useState('');
    const [hashnodeKey, setHashnodeKey] = useState('');
    const [bloggerId, setBloggerId] = useState('');
    const [bloggerToken, setBloggerToken] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchSettings();
        }
    }, [isOpen, userId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

            if (data) {
                setDevtoKey(data.devto_api_key || '');
                setHashnodeKey(data.hashnode_api_key || '');
                setBloggerId(data.blogger_blog_id || '');
                setBloggerToken(data.blogger_access_token || '');
            }
        } catch (error: any) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    devto_api_key: devtoKey,
                    hashnode_api_key: hashnodeKey,
                    blogger_blog_id: bloggerId,
                    blogger_access_token: bloggerToken,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Settings saved successfully!' });

            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-500/20 p-2 rounded-lg text-primary-400">
                            <KeyRound size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">API Integrations</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-left">
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <form id="settings-form" onSubmit={handleSave} className="space-y-8 text-left">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <span className="text-xl">💻</span> Dev.to
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 block">Personal API Key</label>
                                    <p className="text-xs text-slate-500 mb-2">Generate this in your Dev.to Account Settings &gt; Extensions.</p>
                                    <input
                                        type="password"
                                        value={devtoKey}
                                        onChange={(e) => setDevtoKey(e.target.value)}
                                        className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 font-mono text-sm"
                                        placeholder="••••••••••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-border">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <span className="text-xl">📝</span> Hashnode
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 block">Personal Access Token</label>
                                    <p className="text-xs text-slate-500 mb-2">Generate this in your Hashnode Account Settings &gt; Developer.</p>
                                    <input
                                        type="password"
                                        value={hashnodeKey}
                                        onChange={(e) => setHashnodeKey(e.target.value)}
                                        className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 font-mono text-sm"
                                        placeholder="••••••••••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-border">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <span className="text-xl">🟠</span> Blogger
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 block">Blog ID</label>
                                    <input
                                        type="text"
                                        value={bloggerId}
                                        onChange={(e) => setBloggerId(e.target.value)}
                                        className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 font-mono text-sm"
                                        placeholder="00000000000000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 block">Google OAuth Access Token</label>
                                    <input
                                        type="password"
                                        value={bloggerToken}
                                        onChange={(e) => setBloggerToken(e.target.value)}
                                        className="w-full bg-background border border-border text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-primary-500 font-mono text-sm"
                                        placeholder="ya29.a0AfB_bY..."
                                    />
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-6 border-t border-border bg-background/50 flex justify-end gap-3 shrink-0 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="settings-form"
                        disabled={saving || loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
