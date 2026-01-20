// =============================================================================
// @optimai/ai - OpenAI client and AI utilities
// =============================================================================

// Client
export { getOpenAIClient, OpenAI } from './client';

// Completions
export {
  createCompletion,
  createCompletionStream,
  type ChatModel,
  type Message,
  type CompletionOptions,
  type CompletionResult,
} from './completion';

// Function calling
export {
  createCompletionWithFunctions,
  OPTIMAI_FUNCTIONS,
  type FunctionDefinition,
  type FunctionCallResult,
  type CompletionWithFunctionsResult,
} from './functions';

// Embeddings
export {
  createEmbedding,
  createEmbeddings,
  cosineSimilarity,
  findMostSimilar,
  type EmbeddingModel,
  type EmbeddingResult,
  type EmbeddingsResult,
} from './embeddings';

// Prompts
export {
  OPTIMAI_SYSTEM_PROMPT,
  CATEGORIZER_SYSTEM_PROMPT,
  FINANCIAL_ANALYST_PROMPT,
  TASK_EXTRACTOR_PROMPT,
  createContextualPrompt,
} from './prompts';
