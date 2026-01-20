import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (openaiInstance) {
    return openaiInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing OpenAI API key. Set OPENAI_API_KEY environment variable.'
    );
  }

  openaiInstance = new OpenAI({
    apiKey,
  });

  return openaiInstance;
}

export { OpenAI };
