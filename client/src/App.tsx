import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Save, Send, Sparkles, Settings, FileText, Image as ImageIcon, LogOut, Loader2, FileEdit, Clock, Trash2, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import SettingsModal from './components/SettingsModal';
import type { Session } from '@supabase/supabase-js';

const AVAILABLE_PLATFORMS = [
  { id: 'devto', name: 'Dev.to', icon: '💻' },
  { id: 'hashnode', name: 'Hashnode', icon: '📝' },
  { id: 'ghost', name: 'Ghost', icon: '👻' },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);

  // View State
  const [view, setView] = useState<'editor' | 'drafts'>('editor');
  const [isExpanded, setIsExpanded] = useState(false);

  // Editor State
  const [content, setContent] = useState<string>('# Hello Syndicator\n\nWrite your technical blog post here...');
  const [title, setTitle] = useState<string>('My Awesome Tech Post');
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Modal & Loading States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Settings
  const [selectedTone, setSelectedTone] = useState<string>('Professional');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['devto', 'hashnode', 'ghost']);

  // Drafts Data State
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'drafts' && session) {
      loadDrafts();
    }
  }, [view, session]);

  const loadDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', session?.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) setDrafts(data);
    } catch (error) {
      console.error('Failed to load drafts', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) return;
    setIsSavingDraft(true);

    try {
      const draftData: any = {
        user_id: session?.user.id,
        title,
        content,
        updated_at: new Date().toISOString()
      };

      if (activeDraftId) {
        draftData.id = activeDraftId;
      }

      const { data, error } = await supabase
        .from('drafts')
        .upsert(draftData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setActiveDraftId(data.id);
        // Toast or brief alert could go here
      }
    } catch (error: any) {
      alert('Failed to save draft: ' + error.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this draft?')) return;

    try {
      const { error } = await supabase.from('drafts').delete().eq('id', id);
      if (error) throw error;

      if (activeDraftId === id) {
        handleNewPost();
      }
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch (error: any) {
      alert('Failed to delete draft: ' + error.message);
    }
  };

  const handleOpenDraft = (draft: any) => {
    setActiveDraftId(draft.id);
    setTitle(draft.title);
    setContent(draft.content);
    setView('editor');
  };

  const handleNewPost = () => {
    setActiveDraftId(null);
    setTitle('Untitled Post');
    setContent('');
    setView('editor');
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return null;
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${session?.user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const insertAtCursor = (textToInsert: string, startPos: number, endPos: number) => {
    setContent(prev => {
      const before = prev.substring(0, startPos);
      const after = prev.substring(endPos);
      return before + textToInsert + after;
    });
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart || content.length;
      const end = target.selectionEnd || content.length;

      const url = await handleImageUpload(file);
      if (url) insertAtCursor(`\n![${file.name}](${url})\n`, start, end);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart || content.length;
      const end = target.selectionEnd || content.length;

      const url = await handleImageUpload(file);
      if (url) insertAtCursor(`\n![${file.name}](${url})\n`, start, end);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const target = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      const start = target && target.selectionStart !== undefined ? target.selectionStart : content.length;
      const end = target && target.selectionEnd !== undefined ? target.selectionEnd : content.length;

      const url = await handleImageUpload(file);
      if (url) insertAtCursor(`\n![${file.name}](${url})\n`, start, end);
    }
    // Reset file input for identically named uploads in succession
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      alert('Content is empty.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tone: selectedTone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (window.confirm('AI successfully generated a variation! Replace the current editor text?')) {
        setContent(data.result);
        if (activeDraftId) handleSaveDraft(); // Auto save if working on an existing draft
      }
    } catch (error: any) {
      alert('Failed to generate: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform to publish to.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert('Title and content cannot be empty.');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('http://localhost:5000/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          platforms: selectedPlatforms,
          userId: session?.user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      const successCount = data.results.filter((r: any) => r.success).length;
      alert(`Published successfully to ${successCount} out of ${data.results.length} platforms!`);

      // Auto save after successful publish
      handleSaveDraft();
    } catch (error: any) {
      console.error('Publish error:', error);
      alert(`Publishing failed: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden data-color-mode='dark'">
      {/* Header / Navbar */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10 w-full">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-white drop-shadow-sm">Syndicator</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm">
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Log Out">
            <LogOut size={18} />
          </button>
          <div className="h-6 w-px bg-border"></div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || view !== 'editor'}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-lg shadow-primary-600/20 font-medium text-sm disabled:opacity-50"
          >
            {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isExpanded && (
          <aside className="w-64 border-r border-border bg-surface/50 flex flex-col py-6 px-4 shrink-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2 text-left">Workspace</div>

            <button
              onClick={handleNewPost}
              className="mb-6 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-sm border border-slate-700"
            >
              <Plus size={16} /> New Draft
            </button>

            <nav className="flex flex-col gap-2 flex-1">
              <button
                onClick={() => setView('editor')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-left transition-colors ${view === 'editor' ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                <FileEdit size={18} />
                Editor
              </button>
              <button
                onClick={() => setView('drafts')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-left transition-colors ${view === 'drafts' ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                <FileText size={18} />
                Saved Drafts {drafts.length > 0 && <span className="ml-auto bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full">{drafts.length}</span>}
              </button>
              <div className="flex flex-col gap-2 mt-4 mt-auto">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 transition-colors font-medium text-sm text-left opacity-30 cursor-not-allowed">
                  <ImageIcon size={18} />
                  Media Library
                </button>
              </div>
            </nav>
          </aside>
        )}

        {view === 'editor' ? (
          <>
            {/* Editor Area */}
            <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
              {/* Post Meta Header */}
              <div className="border-b border-border p-6 shrink-0 bg-background/95 backdrop-blur-sm z-10 flex gap-4 items-end">
                <div className="flex-1 text-left">
                  <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wider">Post Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-600 border-none outline-none focus:ring-0 p-0"
                    placeholder="Enter an engaging title..."
                  />
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-primary-400 text-sm font-medium mr-2">
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </div>
                )}
                <div className="relative flex shrink-0">
                  <input
                    type="file"
                    id="file-upload-header"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileInput}
                  />
                  <label
                    htmlFor="file-upload-header"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors bg-surface font-medium text-sm shrink-0 cursor-pointer"
                  >
                    <ImageIcon size={16} />
                    <span className="hidden sm:inline">Upload Image</span>
                  </label>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors bg-surface font-medium text-sm shrink-0">
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors bg-surface font-medium text-sm shrink-0 disabled:opacity-50">
                  {isSavingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSavingDraft ? 'Saving...' : 'Save Draft'}
                </button>
              </div>

              {/* Actual Editor */}
              <div className="flex-1 overflow-hidden relative" data-color-mode="dark">
                <MDEditor
                  value={content}
                  onChange={(val) => setContent(val || '')}
                  height="100%"
                  className="h-full border-none shadow-none text-left"
                  preview="live"
                  textareaProps={{
                    onDrop: handleDrop,
                    onDragOver: (e) => e.preventDefault(),
                    onPaste: handlePaste,
                    placeholder: "Drag and drop images, or paste them directly!"
                  }}
                />
              </div>
            </section>

            {/* Right Sidebar (AI Assistance) */}
            {!isExpanded && (
              <aside className="w-80 border-l border-border bg-surface/50 flex flex-col py-6 px-5 shrink-0 text-left">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles size={18} className="text-amber-400" />
                  <h2 className="font-semibold text-white">AI Assistant</h2>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300">
                  <p className="mb-4">Generate platform-specific variations of your post to maximize engagement.</p>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Target Tone</label>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="w-full bg-background border border-border text-white px-3 py-2 rounded-lg focus:outline-none focus:border-primary-500 text-sm"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Beginner Friendly">Beginner Friendly</option>
                      <option value="Executive Summary">Executive Summary</option>
                      <option value="Twitter/X Thread">Twitter/X Thread Style</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || content.length < 10}
                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? 'Generating...' : 'Generate Variations'}
                  </button>
                </div>

                <div className="mt-8 flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Target Platforms</h3>
                  <div className="flex flex-col gap-3">
                    {AVAILABLE_PLATFORMS.map(platform => (
                      <label key={platform.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:border-slate-600 transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-slate-600 bg-slate-800 accent-primary-500 w-4 h-4"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={() => togglePlatform(platform.id)}
                        />
                        <span className="text-xl">{platform.icon}</span>
                        <span className="font-medium text-slate-200">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </>
        ) : (
          /* Drafts List View */
          <section className="flex-1 flex flex-col bg-background/50 overflow-y-auto p-8 relative items-center">
            <div className="max-w-4xl w-full">
              <h2 className="text-3xl font-bold text-white mb-2 text-left">Your Drafts</h2>
              <p className="text-slate-400 mb-8 text-left">Access and manage all your saved blog post drafts.</p>

              {isLoadingDrafts ? (
                <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading your drafts...</span>
                </div>
              ) : drafts.length === 0 ? (
                <div className="bg-surface/50 border border-border rounded-xl p-12 text-center">
                  <div className="bg-slate-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No drafts found</h3>
                  <p className="text-slate-400 mb-6 max-w-sm mx-auto">You haven't saved any drafts yet. Start writing your masterpiece in the editor!</p>
                  <button
                    onClick={handleNewPost}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-all font-medium text-sm"
                  >
                    <Plus size={18} />
                    Write New Post
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drafts.map(draft => (
                    <div
                      key={draft.id}
                      onClick={() => handleOpenDraft(draft)}
                      className="group bg-surface/50 hover:bg-slate-800/80 border border-border hover:border-slate-600 rounded-xl p-5 cursor-pointer transition-all flex flex-col h-56 text-left"
                    >
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{draft.title || 'Untitled Post'}</h3>
                      <p className="text-sm text-slate-400 line-clamp-3 mb-auto">
                        {draft.content.replace(/[#*_\[\]`]/g, '').substring(0, 150) || 'No content written yet...'}
                      </p>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border group-hover:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Clock size={14} />
                          {new Date(draft.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <button
                          onClick={(e) => handleDeleteDraft(e, draft.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={session.user.id}
      />
    </div>
  );
}

export default App;
