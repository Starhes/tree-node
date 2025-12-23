import React, { useState, useContext, useEffect } from 'react';
import { TreeContext, TreeContextType } from '../types';
import { analyzeImage } from '../utils/analyzeImage';
import { compressToWebP } from '../utils/imageCompression';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const TreeCreator: React.FC = () => {
    const { setTreeConfig, treeConfig } = useContext(TreeContext) as TreeContextType;
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Initial check for URL params (Legacy query params support handled in App.tsx now mostly)
    useEffect(() => {
        // App.tsx handles the actual loading of treeId or c1/c2/c3 params.
        // This component focuses on CREATION.
    }, [setTreeConfig]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setIsProcessing(true);
            try {
                const { colors, originalUrl } = await analyzeImage(file);
                setColors(colors);
                setPreviewUrl(originalUrl);

                // Automatically apply locally for preview
                setTreeConfig({
                    primaryColor: colors[0],
                    accentColor: colors[1],
                    lightColor: colors[2],
                    photoUrl: originalUrl // Local blob URL
                });

                setShareUrl(null); // Reset share URL since content changed
            } catch (err) {
                console.error("Failed to analyze image", err);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const generateShareLink = async () => {
        if (!treeConfig || !selectedFile) return;
        setIsUploading(true);

        try {
            // 1. Compress Image
            const compressedBlob = await compressToWebP(selectedFile);
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

            // 2. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('tree-photos') // Using public bucket 'tree-photos'
                .upload(fileName, compressedBlob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 3. Save Record to DB
            const { data: dbData, error: dbError } = await supabase
                .from('trees')
                .insert([
                    {
                        image_path: uploadData.path,
                        colors: {
                            primary: treeConfig.primaryColor,
                            accent: treeConfig.accentColor,
                            light: treeConfig.lightColor
                        }
                    }
                ])
                .select()
                .single();

            if (dbError) throw dbError;

            // 4. Generate Link
            if (dbData) {
                const url = `${window.location.origin}${window.location.pathname}?treeId=${dbData.id}`;
                setShareUrl(url);
                navigator.clipboard.writeText(url);
            }

        } catch (error) {
            console.error('Error sharing tree:', error);
            alert('Failed to generate share link. Please check your internet connection or Supabase config.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-[50] flex flex-col items-end pointer-events-auto">
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
                {isPanelOpen ? '✖' : '🪄'}
            </button>

            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="mt-4 p-6 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl w-80 shadow-2xl"
                    >
                        <h2 className="text-xl cinzel font-bold text-amber-300 mb-4 border-b border-white/10 pb-2">Create Your Tree</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Upload Photo for Inspiration</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-300
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-emerald-900 file:text-emerald-100
                                      hover:file:bg-emerald-800
                                      cursor-pointer"
                                />
                            </div>

                            {isProcessing && <div className="text-sm text-emerald-400 animate-pulse">✨ Extracting magic...</div>}

                            {colors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400">Generated Palette:</p>
                                    <div className="flex gap-2">
                                        {colors.map((c, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border border-white/30 shadow-lg" style={{ backgroundColor: c }} title={c} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {previewUrl && (
                                <div className="relative group rounded-lg overflow-hidden border border-white/10">
                                    <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-white">Applied to Tree</span>
                                    </div>
                                </div>
                            )}

                            {treeConfig && selectedFile && (
                                <div className="pt-4 border-t border-white/10">
                                    <button
                                        onClick={generateShareLink}
                                        disabled={isUploading}
                                        className={`w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg font-bold cinzel shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isUploading ? '⌛ Uploading & Securing...' : '🔗 Share This Design'}
                                    </button>
                                    {shareUrl && (
                                        <div className="mt-2 p-2 bg-emerald-900/30 rounded text-xs text-emerald-200 border border-emerald-500/30">
                                            Link copied to clipboard! <br />
                                            <span className="opacity-50 text-[10px] break-all">{shareUrl}</span>
                                        </div>
                                    )}
                                    <p className="mt-2 text-[10px] text-gray-500 italic">
                                        Note: Photos are securely stored and optimized.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TreeCreator;
