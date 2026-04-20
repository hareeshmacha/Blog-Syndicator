import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { publishToDevTo, publishToHashnode, publishToBlogger } from '../services/publishers.js';
import type { PublishResult } from '../services/publishers.js';

export const publishRouter = Router();

publishRouter.post('/', async (req, res): Promise<any> => {
    const { title, content, platforms, userId, platformContents, skipCanonicalLinks } = req.body;

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

        // Platform precedence for canonical URL: Dev.to > Hashnode > Blogger
        const targetPlatforms = [...platforms].sort((a, b) => {
            const order: Record<string, number> = { 'devto': 1, 'hashnode': 2, 'blogger': 3 };
            return (order[a] || 99) - (order[b] || 99);
        });

        for (const platform of targetPlatforms) {
            let result: PublishResult | null = null;
            let platformContent = (platformContents && platformContents[platform]) ? platformContents[platform] : content;
            const isCustomContent = !!(platformContents && platformContents[platform]);

            if (platform === 'devto' && profile.devto_api_key) {
                result = await publishToDevTo(title, platformContent, profile.devto_api_key, skipCanonicalLinks ? undefined : canonicalUrl);
            } else if (platform === 'hashnode' && profile.hashnode_api_key) {
                result = await publishToHashnode(title, platformContent, profile.hashnode_api_key, skipCanonicalLinks ? undefined : canonicalUrl);
            } else if (platform === 'blogger' && profile.blogger_blog_id && profile.blogger_access_token) {
                result = await publishToBlogger(title, platformContent, profile.blogger_blog_id, profile.blogger_access_token, skipCanonicalLinks ? undefined : canonicalUrl);
            } else {
                console.error(`[PUBLISH] ${platform}: Missing credentials. Profile keys available:`, Object.keys(profile).filter(k => profile[k]));
                results.push({ platform, success: false, error: 'Missing API Key in settings.' });
                continue;
            }

            if (result && !result.success) {
                console.error(`[PUBLISH] ${platform} FAILED:`, result.error);
            } else if (result) {
                console.log(`[PUBLISH] ${platform} SUCCESS:`, result.url);
            }

            if (result) {
                results.push(result);
                if (!skipCanonicalLinks && result.success && result.url && !canonicalUrl) {
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
