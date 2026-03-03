import { ChatMessage, ChatContext, AnalysisResult, RESOURCE_CATEGORIES } from './types';

/**
 * AI Chatbot for Civic Data Analysis
 * Uses Gemini API when available, falls back to rich template responses.
 */
export class CivicChatbot {
    private apiKey: string | null;
    private history: ChatMessage[] = [];

    constructor(apiKey?: string) {
        this.apiKey = apiKey || null;
    }

    /**
     * Send a message and get a response.
     */
    async chat(userMessage: string, context?: ChatContext): Promise<string> {
        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
        };
        this.history.push(userMsg);

        let response: string;

        if (this.apiKey) {
            try {
                response = await this.callGemini(userMessage, context);
            } catch (e) {
                response = this.getTemplateResponse(userMessage, context);
            }
        } else {
            response = this.getTemplateResponse(userMessage, context);
        }

        const assistantMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
        };
        this.history.push(assistantMsg);

        return response;
    }

    /**
     * Call Gemini API for analysis.
     */
    private async callGemini(message: string, context?: ChatContext): Promise<string> {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: this.apiKey! });

        const systemPrompt = this.buildSystemPrompt(context);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }],
                },
            ],
        });

        return response.text || 'I apologize, I could not generate a response. Please try again.';
    }

    /**
     * Build a context-aware system prompt.
     */
    private buildSystemPrompt(context?: ChatContext): string {
        let prompt = `You are a civic equity analyst AI assistant for Sudo Map-The-Gap, a terminal-based civic equity visualizer. 
You help community organizers understand resource distribution patterns, identify service deserts, and advocate for equitable resource allocation.

Your tone is: knowledgeable, empathetic, solution-oriented, and data-driven. Keep responses concise (2-3 paragraphs max).
Use plain language that non-technical community members can understand.
When discussing data, frame it in terms of human impact.`;

        if (context?.scenario) {
            prompt += `\n\nCurrent scenario: ${context.scenario.name} — ${context.scenario.description}`;
        }

        if (context?.analysis) {
            const a = context.analysis;
            prompt += `\n\nCurrent Analysis Data:
- Equity Index: ${a.equityIndex}/100
- Coverage: ${a.coveragePercent}%
- Critical Deserts: ${a.criticalDeserts} grid zones
- Disparity Score: ${a.disparityScore}/100
- Total Resources: ${a.totalPoints}
- Average Score: ${a.averageScore}`;

            if (a.categoryBreakdown.length > 0) {
                prompt += '\n- Category breakdown:';
                a.categoryBreakdown.forEach(c => {
                    const info = RESOURCE_CATEGORIES.find(r => r.key === c.category);
                    prompt += `\n  - ${info?.label || c.category}: ${c.count} points, avg score ${c.avgScore.toFixed(2)}`;
                });
            }
        }

        if (context?.diffMode) {
            prompt += '\n\nThe user is currently viewing a CIVIC DIFF — comparing planned budget vs actual services.';
        }

        return prompt;
    }

    /**
     * Rich template responses when API is unavailable.
     */
    private getTemplateResponse(message: string, context?: ChatContext): string {
        const lower = message.toLowerCase();

        // Analysis-aware responses
        if (context?.analysis) {
            const a = context.analysis;

            if (lower.includes('equity') || lower.includes('fair') || lower.includes('equal')) {
                const level = a.equityIndex > 60 ? 'relatively equitable' : a.equityIndex > 35 ? 'moderately inequitable' : 'highly inequitable';
                return `📊 The current equity index is **${a.equityIndex}/100**, indicating a **${level}** resource distribution. ` +
                    `${a.criticalDeserts} zones are classified as critical deserts — areas where residents have virtually no access to essential services. ` +
                    `The disparity score of ${a.disparityScore}/100 suggests ${a.disparityScore > 50 ? 'significant variation in resource access across the mapped area' : 'relatively consistent resource levels, though gaps remain'}. ` +
                    `\n\nCommunity organizers should focus advocacy on the desert zones, which often correspond to historically underserved neighborhoods.`;
            }

            if (lower.includes('desert') || lower.includes('gap') || lower.includes('missing')) {
                return `🏜️ This map reveals **${a.criticalDeserts} critical desert zones** — grid cells where the resource score falls below 0.10. ` +
                    `These areas represent neighborhoods where residents may need to travel significantly further for basic services. ` +
                    `Only **${a.coveragePercent}%** of the mapped area has direct resource coverage. ` +
                    `\n\nTo learn more, try asking about specific resource categories like "transit" or "food" to see where specific services are lacking.`;
            }

            if (lower.includes('transit') || lower.includes('bus') || lower.includes('train')) {
                const transit = a.categoryBreakdown.find(c => c.category === 'transit');
                if (transit) {
                    return `🚌 **Transit Analysis**: ${transit.count} transit points mapped with an average access score of ${transit.avgScore.toFixed(2)}. ` +
                        `${transit.avgScore < 0.4 ? 'This suggests significant transit deserts in the area — residents in low-score zones may face long commutes or lack public transportation entirely.' : 'Transit coverage is moderate, but peripheral areas still face reduced service levels.'}` +
                        `\n\nTransit equity directly impacts economic mobility — without reliable public transportation, residents in underserved areas face higher barriers to employment, healthcare, and education.`;
                }
            }

            if (lower.includes('food') || lower.includes('grocery') || lower.includes('hunger')) {
                const food = a.categoryBreakdown.find(c => c.category === 'food');
                if (food) {
                    return `🍎 **Food Access Analysis**: ${food.count} food/grocery points mapped with an average score of ${food.avgScore.toFixed(2)}. ` +
                        `${food.avgScore < 0.4 ? 'This indicates a food desert — families in low-score areas may rely on convenience stores or fast food due to lack of fresh food access.' : 'Food coverage exists but may not reach all communities equally.'}` +
                        `\n\nFood deserts disproportionately affect low-income neighborhoods and communities of color. Advocating for grocery co-ops, farmers markets, and mobile food pantries can help bridge the gap.`;
                }
            }

            if (lower.includes('health') || lower.includes('hospital') || lower.includes('clinic')) {
                const health = a.categoryBreakdown.find(c => c.category === 'healthcare');
                if (health) {
                    return `🏥 **Healthcare Access**: ${health.count} healthcare facilities mapped with an average score of ${health.avgScore.toFixed(2)}. ` +
                        `${health.avgScore < 0.4 ? 'Healthcare access is critically low in portions of this area. Residents may face extended travel times for basic medical care.' : 'Healthcare facilities are present but distribution may not align with population density.'}` +
                        `\n\nEquitable healthcare access is a fundamental right. Community health centers, telehealth initiatives, and mobile clinics can serve as interim solutions while advocating for permanent infrastructure.`;
                }
            }
        }

        // General responses
        if (lower.includes('help') || lower.includes('what can you')) {
            return `👋 I'm the **Civic Equity Assistant** for Map-The-Gap! Here's what I can help with:\n\n` +
                `• **"What's the equity index?"** — explains the overall fairness of resource distribution\n` +
                `• **"Show me the deserts"** — identifies critical resource gaps\n` +
                `• **"Tell me about transit/food/healthcare"** — category-specific analysis\n` +
                `• **"What can organizers do?"** — actionable recommendations\n` +
                `• **"How does the diff work?"** — explains the civic diff feature\n\n` +
                `Try loading a scenario and running the analysis first for context-aware insights!`;
        }

        if (lower.includes('diff') || lower.includes('compare') || lower.includes('budget')) {
            return `📊 The **Civic Diff** compares two datasets side by side — typically "Planned Budget" vs "Actual Services Delivered." ` +
                `Cells that flash ⚠️ indicate where promises weren't kept: where planned resources never materialized. ` +
                `Red zones (critical) show the widest gap between planning and reality; yellow zones (minor) show smaller but still meaningful shortfalls.\n\n` +
                `This is a powerful accountability tool — bring these visualizations to city council meetings to show exactly where the gap exists.`;
        }

        if (lower.includes('organiz') || lower.includes('action') || lower.includes('what can')) {
            return `✊ **Actionable Steps for Community Organizers:**\n\n` +
                `1. **Screenshot the map** — use it in presentations at city hall and community meetings\n` +
                `2. **Run the Civic Diff** — compare what was promised vs what was delivered\n` +
                `3. **Focus on desert zones** — these red areas represent real families without access\n` +
                `4. **Share the data** — this tool runs over SSH, making it accessible anywhere\n` +
                `5. **Build coalitions** — connect with organizations serving each resource category\n\n` +
                `Remember: data becomes power only when communities use it to demand accountability.`;
        }

        if (lower.includes('about') || lower.includes('mission') || lower.includes('why')) {
            return `🌍 **Sudo Map-The-Gap** exists because resource allocation data is often buried in spreadsheets and complex formats. ` +
                `Community organizers need tools that make disparities **visceral and immediate** — not abstract. ` +
                `By rendering city data as a 16-bit RPG map, we use a visual language that's universally intuitive: ` +
                `lush green = thriving, barren desert = underserved.\n\n` +
                `This tool is open source, runs over SSH, and requires no heavy infrastructure. It's civic tech for the people.`;
        }

        // Default
        return `I can help you understand the resource distribution data visualized on the map. ` +
            `Try asking me about:\n` +
            `• Equity analysis and resource gaps\n` +
            `• Specific resource categories (transit, food, healthcare)\n` +
            `• How to use the Civic Diff feature\n` +
            `• Actionable steps for community organizing\n\n` +
            `Load a city scenario and run the visualizer for data-aware responses! 🗺️`;
    }

    /**
     * Get conversation history.
     */
    getHistory(): ChatMessage[] {
        return [...this.history];
    }

    /**
     * Clear conversation.
     */
    clearHistory(): void {
        this.history = [];
    }
}
