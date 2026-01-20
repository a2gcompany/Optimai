// =============================================================================
// AI Transaction Categorizer - Automatically categorize transactions using AI
// =============================================================================

import {
  createCompletion,
  createEmbedding,
  cosineSimilarity,
  CATEGORIZER_SYSTEM_PROMPT,
  type Message,
} from '@optimai/ai';
import type { ParsedTransaction, Category } from '@optimai/types';

// Default categories with keywords for rule-based fallback
export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: 'income' | 'expense' | 'both';
  keywords: string[];
}> = [
  {
    name: 'Comida',
    type: 'expense',
    keywords: [
      'restaurant', 'restaurante', 'mercado', 'supermercado', 'supermarket',
      'grocery', 'uber eats', 'glovo', 'rappi', 'deliveroo', 'just eat',
      'mcdonalds', 'burger', 'pizza', 'cafe', 'coffee', 'starbucks',
      'carrefour', 'lidl', 'aldi', 'mercadona', 'eroski', 'dia'
    ],
  },
  {
    name: 'Transporte',
    type: 'expense',
    keywords: [
      'uber', 'cabify', 'taxi', 'bolt', 'lyft', 'gasolina', 'gas station',
      'petrol', 'shell', 'bp', 'repsol', 'cepsa', 'metro', 'bus', 'renfe',
      'tren', 'train', 'parking', 'toll', 'peaje', 'car rental', 'alquiler coche'
    ],
  },
  {
    name: 'Entretenimiento',
    type: 'expense',
    keywords: [
      'netflix', 'spotify', 'hbo', 'disney', 'prime video', 'youtube',
      'cinema', 'cine', 'steam', 'playstation', 'xbox', 'nintendo',
      'concert', 'concierto', 'festival', 'teatro', 'theater', 'museum'
    ],
  },
  {
    name: 'Compras',
    type: 'expense',
    keywords: [
      'amazon', 'ebay', 'aliexpress', 'zara', 'h&m', 'primark', 'ikea',
      'apple', 'mediamarkt', 'el corte ingles', 'fnac', 'decathlon',
      'nike', 'adidas', 'mango', 'pull&bear', 'bershka'
    ],
  },
  {
    name: 'Salud',
    type: 'expense',
    keywords: [
      'farmacia', 'pharmacy', 'hospital', 'clinica', 'clinic', 'doctor',
      'medico', 'dentist', 'dentista', 'gym', 'gimnasio', 'fitness',
      'yoga', 'pilates', 'optica', 'optical'
    ],
  },
  {
    name: 'Educación',
    type: 'expense',
    keywords: [
      'udemy', 'coursera', 'masterclass', 'linkedin learning', 'skillshare',
      'universidad', 'university', 'college', 'school', 'escuela',
      'libro', 'book', 'kindle', 'audible', 'academy'
    ],
  },
  {
    name: 'Servicios',
    type: 'expense',
    keywords: [
      'electricidad', 'electric', 'luz', 'agua', 'water', 'gas natural',
      'internet', 'telefono', 'phone', 'vodafone', 'movistar', 'orange',
      'yoigo', 'o2', 'seguro', 'insurance', 'alquiler', 'rent', 'hipoteca'
    ],
  },
  {
    name: 'Salario',
    type: 'income',
    keywords: [
      'nomina', 'payroll', 'salary', 'sueldo', 'wage', 'pago mensual',
      'transferencia nomina', 'abono nomina'
    ],
  },
  {
    name: 'Freelance',
    type: 'income',
    keywords: [
      'factura', 'invoice', 'pago cliente', 'project payment', 'consultoria',
      'consulting', 'freelance', 'upwork', 'fiverr', 'toptal'
    ],
  },
  {
    name: 'Inversiones',
    type: 'income',
    keywords: [
      'dividendo', 'dividend', 'rendimiento', 'yield', 'intereses', 'interest',
      'bitcoin', 'crypto', 'ethereum', 'trading', 'broker', 'degiro',
      'interactive brokers', 'etoro', 'binance', 'coinbase'
    ],
  },
  {
    name: 'Otros',
    type: 'both',
    keywords: [],
  },
];

/**
 * Categorize using keyword matching (fast, no API calls)
 */
export function categorizeByKeywords(description: string): string {
  const descLower = description.toLowerCase();

  for (const category of DEFAULT_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        return category.name;
      }
    }
  }

  return 'Otros';
}

/**
 * Categorize single transaction using AI
 */
export async function categorizeWithAI(description: string): Promise<{
  category: string;
  confidence: number;
}> {
  try {
    const messages: Message[] = [
      { role: 'system', content: CATEGORIZER_SYSTEM_PROMPT },
      { role: 'user', content: description },
    ];

    const result = await createCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 50,
    });

    const category = result.content.trim();
    const validCategories = DEFAULT_CATEGORIES.map((c) => c.name);

    if (validCategories.includes(category)) {
      return { category, confidence: 0.9 };
    }

    // Try to match partial response
    const matched = validCategories.find((c) =>
      category.toLowerCase().includes(c.toLowerCase())
    );

    if (matched) {
      return { category: matched, confidence: 0.7 };
    }

    // Fall back to keyword matching
    return {
      category: categorizeByKeywords(description),
      confidence: 0.5,
    };
  } catch (error) {
    console.error('AI categorization failed:', error);
    return {
      category: categorizeByKeywords(description),
      confidence: 0.3,
    };
  }
}

/**
 * Batch categorize transactions (more efficient)
 */
export async function categorizeBatch(
  transactions: ParsedTransaction[],
  options: {
    useAI?: boolean;
    batchSize?: number;
  } = {}
): Promise<ParsedTransaction[]> {
  const { useAI = true, batchSize = 10 } = options;

  if (!useAI) {
    return transactions.map((t) => ({
      ...t,
      suggestedCategory: categorizeByKeywords(t.description),
      confidence: 0.5,
    }));
  }

  const results: ParsedTransaction[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    // First try keyword matching for obvious cases
    const needsAI: number[] = [];
    const batchResults = batch.map((t, idx) => {
      const keywordCategory = categorizeByKeywords(t.description);
      if (keywordCategory !== 'Otros') {
        return {
          ...t,
          suggestedCategory: keywordCategory,
          confidence: 0.7,
        };
      }
      needsAI.push(idx);
      return t;
    });

    // Use AI for ambiguous cases
    if (needsAI.length > 0) {
      const aiPromises = needsAI.map(async (idx) => {
        const t = batch[idx];
        const { category, confidence } = await categorizeWithAI(t.description);
        batchResults[idx] = {
          ...t,
          suggestedCategory: category,
          confidence,
        };
      });

      await Promise.all(aiPromises);
    }

    results.push(...batchResults);
  }

  return results;
}

/**
 * Learn from user corrections to improve future categorization
 */
export interface CategoryPattern {
  pattern: string;
  category: string;
  isRegex: boolean;
  userId?: string;
}

const userPatterns: Map<string, CategoryPattern[]> = new Map();

export function addUserPattern(
  userId: string,
  pattern: string,
  category: string,
  isRegex = false
): void {
  const patterns = userPatterns.get(userId) || [];
  patterns.unshift({ pattern, category, isRegex, userId });
  userPatterns.set(userId, patterns);
}

export function categorizeWithUserPatterns(
  description: string,
  userId: string
): string | null {
  const patterns = userPatterns.get(userId);
  if (!patterns) return null;

  const descLower = description.toLowerCase();

  for (const p of patterns) {
    if (p.isRegex) {
      try {
        const regex = new RegExp(p.pattern, 'i');
        if (regex.test(description)) {
          return p.category;
        }
      } catch {
        continue;
      }
    } else if (descLower.includes(p.pattern.toLowerCase())) {
      return p.category;
    }
  }

  return null;
}

/**
 * Smart categorization: user patterns → keywords → AI
 */
export async function smartCategorize(
  description: string,
  userId?: string
): Promise<{ category: string; confidence: number; source: string }> {
  // 1. Check user patterns first
  if (userId) {
    const userCategory = categorizeWithUserPatterns(description, userId);
    if (userCategory) {
      return {
        category: userCategory,
        confidence: 1.0,
        source: 'user_pattern',
      };
    }
  }

  // 2. Try keyword matching
  const keywordCategory = categorizeByKeywords(description);
  if (keywordCategory !== 'Otros') {
    return {
      category: keywordCategory,
      confidence: 0.8,
      source: 'keywords',
    };
  }

  // 3. Fall back to AI
  const { category, confidence } = await categorizeWithAI(description);
  return {
    category,
    confidence,
    source: 'ai',
  };
}

/**
 * Get category statistics from transactions
 */
export function getCategoryStats(
  transactions: ParsedTransaction[]
): Map<string, { count: number; total: number }> {
  const stats = new Map<string, { count: number; total: number }>();

  for (const t of transactions) {
    const category = t.suggestedCategory || 'Otros';
    const current = stats.get(category) || { count: 0, total: 0 };
    stats.set(category, {
      count: current.count + 1,
      total: current.total + Math.abs(t.amount),
    });
  }

  return stats;
}
