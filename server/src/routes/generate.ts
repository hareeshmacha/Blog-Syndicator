import { Router } from 'express';
import type { Request, Response } from 'express';

export const generateRouter = Router();

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

generateRouter.post('/', async (req: Request, res: Response): Promise<Response> => {
    const content = req.body.content?.trim();
    const tone = req.body.tone?.trim();
    const targetPlatform = req.body.targetPlatform?.trim();

    if (!content || !tone) {
        return res.status(400).json({ error: 'Missing content or tone parameter' });
    }

    if (typeof content !== 'string' || typeof tone !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    try {
        const prompt = targetPlatform ? `
You are an expert developer advocate and technical writer. 
Rewrite the following technical blog post specifically for the ${targetPlatform} platform's audience. Adopt a "${tone}" tone.

**CRITICAL INSTRUCTIONS — FOLLOW EXACTLY**:
1. Output ONLY the raw Markdown text. Do NOT include conversational filler like "Here is your rewritten post:".
2. You MUST preserve the EXACT same number of sections, headings, and paragraphs. Do NOT skip, merge, or omit ANY section.
3. Maintain the EXACT original Markdown structure (Headings, bolding, bullet lists, numbered lists).
4. Do NOT wrap the overall output in a \`\`\`markdown block.
5. You MUST preserve ALL programming code blocks (both inline \`code\` and fenced \`\`\` blocks) perfectly — copy them character-for-character without modification.
6. The output MUST be approximately the same length as the original. Do NOT summarize or shorten.
7. Only rephrase the prose (the non-code text). Do not remove examples, explanations, or details.

Original text:
---
${content}
---
` : `
You are an expert developer advocate and technical writer. 
Rewrite the following technical blog post to fit a "${tone}" tone.

**CRITICAL INSTRUCTIONS — FOLLOW EXACTLY**:
1. Output ONLY the raw Markdown text. Do NOT include conversational filler like "Here is your rewritten post:".
2. You MUST preserve the EXACT same number of sections, headings, and paragraphs. Do NOT skip, merge, or omit ANY section.
3. Maintain the EXACT original Markdown structure (Headings, bolding, bullet lists, numbered lists).
4. Do NOT wrap the overall output in a \`\`\`markdown block.
5. You MUST preserve ALL programming code blocks (both inline \`code\` and fenced \`\`\` blocks) perfectly — copy them character-for-character without modification.
6. The output MUST be approximately the same length as the original. Do NOT summarize or shorten.
7. Only rephrase the prose (the non-code text). Do not remove examples, explanations, or details.

Original text:
---
${content}
---
`;

        let outputText = '';
        let retries = 5;
        let lastError: unknown = null;

        while (retries > 0) {
            try {
                const response = await fetch(GEMINI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`${response.status} ${errText}`);
                }

                const data = await response.json() as any;
                outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                break;
            } catch (err: any) {
                lastError = err;
                const errorStr = String(err.message || '');
                if (errorStr.includes('503') || errorStr.includes('429')) {
                    retries--;
                    if (retries > 0) {
                        console.log(`Gemini overload (${errorStr}), retrying in 3s...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        continue;
                    }
                }
                throw err;
            }
        }

        if (!outputText) throw lastError;

        // Clean up conversational filler and markdown wrappers robustly
        let cleanText = outputText
            .replace(/^here is.*:\n?/i, '')
            .replace(/^```[a-zA-Z]*\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();

        return res.json({ result: cleanText });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Gemini error:', message);
        return res.status(500).json({ error: 'Failed to generate variation: ' + message });
    }
});
