import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { publishToDevTo, publishToHashnode, publishToGhost } from '../services/publishers.js';
import type { PublishResult } from '../services/publishers.js';

export const publishRouter = Router();

publishRouter.post('/', async (req, res): Promise<any> => {
    const { title, content, platforms, userId } = req.body;

    if (!userId || !title || !content || !platforms || platforms.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        const results: PublishResult[] = [];
        let canonicalUrl: string | undefined = undefined;

        // Platform precedence for canonical URL: Dev.to > Hashnode > Ghost
        const targetPlatforms = [...platforms].sort((a, b) => {
            const order: Record<string, number> = { 'devto': 1, 'hashnode': 2, 'ghost': 3 };
            return (order[a] || 99) - (order[b] || 99);
        });

        for (const platform of targetPlatforms) {
            let result: PublishResult | null = null;

            if (platform === 'devto' && profile.devto_api_key) {
                result = await publishToDevTo(title, content, profile.devto_api_key, canonicalUrl);
            } else if (platform === 'hashnode' && profile.hashnode_api_key) {
                result = await publishToHashnode(title, content, profile.hashnode_api_key, canonicalUrl);
            } else if (platform === 'ghost' && profile.ghost_api_url && profile.ghost_admin_api_key) {
                result = await publishToGhost(title, content, profile.ghost_api_url, profile.ghost_admin_api_key, canonicalUrl);
            } else {
                results.push({ platform, success: false, error: 'Missing API Key in settings.' });
                continue;
            }

            if (result) {
                results.push(result);
                if (result.success && result.url && !canonicalUrl) {
                    canonicalUrl = result.url;
                }
            }
        }

        res.json({ results, canonicalUrl });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
