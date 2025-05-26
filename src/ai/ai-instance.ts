import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts', // Ensure this directory exists or remove if not using
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY, // GOOGLE_GENAI_API_KEY is for Genkit AI features
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for Genkit
});
