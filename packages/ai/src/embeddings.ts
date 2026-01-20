import { getOpenAIClient } from './client';

export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';

export interface EmbeddingResult {
  embedding: number[];
  index: number;
}

export interface EmbeddingsResult {
  embeddings: EmbeddingResult[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

const DEFAULT_EMBEDDING_MODEL: EmbeddingModel = 'text-embedding-3-small';

export async function createEmbedding(
  text: string,
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL
): Promise<number[]> {
  const result = await createEmbeddings([text], model);
  return result.embeddings[0].embedding;
}

export async function createEmbeddings(
  texts: string[],
  model: EmbeddingModel = DEFAULT_EMBEDDING_MODEL
): Promise<EmbeddingsResult> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model,
    input: texts,
  });

  return {
    embeddings: response.data.map((d) => ({
      embedding: d.embedding,
      index: d.index,
    })),
    usage: {
      promptTokens: response.usage.prompt_tokens,
      totalTokens: response.usage.total_tokens,
    },
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: { embedding: number[]; id: string }[],
  topK: number = 5
): { id: string; similarity: number }[] {
  const similarities = embeddings.map((e) => ({
    id: e.id,
    similarity: cosineSimilarity(queryEmbedding, e.embedding),
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
