import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Image as ImageIcon, Copy, Loader2, Trash2 } from 'lucide-react';

interface MediaLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function MediaLibraryModal({ isOpen, onClose, userId }: MediaLibraryModalProps) {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchImages();
        }
    }, [isOpen, userId]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.storage
                .from('images')
                .list(userId + '/', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) throw error;
            if (data) {
                // Filter out the `.emptyFolderPlaceholder` file which is sometimes generated
                const validFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder');
                setImages(validFiles);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (fileName: string) => {
        return supabase.storage.from('images').getPublicUrl(`${userId}/${fileName}`).data.publicUrl;
    };

    const handleCopyMarkdown = (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation();
        const url = getImageUrl(fileName);
        const text = `\n![${fileName}](${url})\n`;
        navigator.clipboard.writeText(text);

        // Show temporary visual feedback
        const btn = e.currentTarget as HTMLButtonElement;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="text-xs">Copied!</span>';
        setTimeout(() => {
            if (btn) btn.innerHTML = originalHtml;
        }, 1500);
    };

    const handleDelete = async (e: React.MouseEvent, fileName: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete this image permanently from storage?')) return;

        setActionLoading(fileName);
        try {
            const { error } = await supabase.storage
                .from('images')
                .remove([`${userId}/${fileName}`]);

            if (error) throw error;
            setImages(prev => prev.filter(img => img.name !== fileName));
        } catch (error) {
            console.error('Failed to delete image:', error);
            alert('Failed to delete image.');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl w-full max-w-4xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-500/20 p-2 rounded-lg text-primary-400">
                            <ImageIcon size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Media Library</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-primary-500" />
                            <p>Loading your media...</p>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="text-lg text-slate-300 font-medium">No images found</p>
                            <p className="text-sm max-w-sm mt-2">Images you upload through the markdown editor will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {images.map(image => (
                                <div key={image.id || image.name} className="group relative bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
                                    <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={getImageUrl(image.name)}
                                            alt={image.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="p-3 bg-surface/90 border-t border-border flex justify-between items-center z-10 absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform">
                                        <button
                                            onClick={(e) => handleCopyMarkdown(e, image.name)}
                                            className="flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-500 text-white rounded p-1.5 flex-1 transition-colors"
                                            title="Copy Markdown"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <div className="w-2" />
                                        <button
                                            onClick={(e) => handleDelete(e, image.name)}
                                            disabled={actionLoading === image.name}
                                            className="bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded p-1.5 transition-colors disabled:opacity-50"
                                            title="Delete Image"
                                        >
                                            {actionLoading === image.name ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
