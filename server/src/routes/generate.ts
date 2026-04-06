import { Router } from 'express';
import type { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateRouter = Router();

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

generateRouter.post('/', async (req: Request, res: Response): Promise<Response> => {
    const content = req.body.content?.trim();
    const tone = req.body.tone?.trim();

    if (!content || !tone) {
        return res.status(400).json({ error: 'Missing content or tone parameter' });
    }

    if (typeof content !== 'string' || typeof tone !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are an expert developer advocate and technical writer. 
Rewrite the following technical blog post to fit a "${tone}" tone.

**CRITICAL INSTRUCTIONS**:
1. Output ONLY the raw Markdown text. Do NOT include conversational filler like "Here is your rewritten post:".
2. Maintain the EXACT original Markdown structure (Headings, bolding, bullet lists).
3. Do NOT wrap the overall output in a \`\`\`markdown block.
4. You MUST preserve all programming code blocks (both inline \`code\` and multi-line \`\`\` blocks) perfectly without modifying a single character inside them. The rewritten prose should seamlessly surround the preserved code.

Original text:
---
${content}
---
`;

        const result = await model.generateContent(prompt);
        let outputText = result.response.text();

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
