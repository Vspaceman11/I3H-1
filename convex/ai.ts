"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const AnalysisResultSchema = {
  category: "string",
  severity: "number (1-10)",
  description: "string",
};

export const analyzeImage = action({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args): Promise<{
    category: string;
    severity: number;
    description: string;
  }> => {
    const imageUrl = await ctx.storage.getUrl(args.imageId);
    if (!imageUrl) throw new Error("Image not found in storage");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: `You are an urban issue analyzer for the city of Heilbronn, Germany. Analyze this image and identify any urban issues (e.g., potholes, graffiti, broken streetlights, trash, damaged vegetation, infrastructure problems).

Respond with ONLY a JSON object in this exact format:
${JSON.stringify(AnalysisResultSchema, null, 2)}

Where:
- category: one of "pothole", "graffiti", "lighting", "trash", "vegetation", "infrastructure", "other"
- severity: integer from 1 (minor) to 10 (critical/dangerous)
- description: brief factual description of the issue (max 200 chars)

If no urban issue is visible, respond with category "other", severity 1, and describe what you see.
JSON only, no markdown, no explanation.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 256,
      },
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      category: string;
      severity: number;
      description: string;
    };

    const validCategories = [
      "pothole",
      "graffiti",
      "lighting",
      "trash",
      "vegetation",
      "infrastructure",
      "other",
    ];

    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : "other";
    const severity = Math.min(10, Math.max(1, Math.round(parsed.severity)));
    const description =
      typeof parsed.description === "string"
        ? parsed.description.slice(0, 200)
        : "No description available";

    return { category, severity, description };
  },
});
