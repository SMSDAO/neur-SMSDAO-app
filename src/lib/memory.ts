/**
 * Memory Layer Integration using mem0ai
 * Provides persistent memory capabilities for the AI agent
 */

import { MemoryClient } from 'mem0ai';

interface Memory {
  id: string;
  memory: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

interface MemorySearchResult {
  success: boolean;
  memories?: Memory[];
  error?: string;
}

interface MemoryAddResult {
  success: boolean;
  memoryId?: string;
  error?: string;
}

let memoryClient: MemoryClient | null = null;

/**
 * Initialize the memory client
 */
function getMemoryClient(): MemoryClient | null {
  if (!process.env.MEM0_API_KEY) {
    console.error('MEM0_API_KEY not configured');
    return null;
  }

  if (!memoryClient) {
    memoryClient = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
  }

  return memoryClient;
}

/**
 * Add a memory to the system
 */
export async function addMemory(
  message: string,
  userId: string,
  metadata?: Record<string, any>,
): Promise<MemoryAddResult> {
  const client = getMemoryClient();

  if (!client) {
    return {
      success: false,
      error: 'Memory client not configured. Set MEM0_API_KEY environment variable.',
    };
  }

  try {
    const result = await client.add(message, {
      user_id: userId,
      metadata,
    });

    // Handle both array and object responses
    const memoryId = (result as any)?.id || (Array.isArray(result) && result.length > 0 ? result[0]?.id : undefined);

    return {
      success: true,
      memoryId,
    };
  } catch (error) {
    console.error('Error adding memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add memory',
    };
  }
}

/**
 * Search memories for a user
 */
export async function searchMemories(
  query: string,
  userId: string,
  limit: number = 10,
): Promise<MemorySearchResult> {
  const client = getMemoryClient();

  if (!client) {
    return {
      success: false,
      error: 'Memory client not configured. Set MEM0_API_KEY environment variable.',
    };
  }

  try {
    const results = await client.search(query, {
      user_id: userId,
      limit,
    });

    const memories: Memory[] = results.map((result: any) => ({
      id: result.id,
      memory: result.memory || result.text,
      userId: result.user_id,
      metadata: result.metadata,
      createdAt: result.created_at,
    }));

    return {
      success: true,
      memories,
    };
  } catch (error) {
    console.error('Error searching memories:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to search memories',
    };
  }
}

/**
 * Get all memories for a user
 */
export async function getUserMemories(
  userId: string,
  limit: number = 50,
): Promise<MemorySearchResult> {
  const client = getMemoryClient();

  if (!client) {
    return {
      success: false,
      error: 'Memory client not configured. Set MEM0_API_KEY environment variable.',
    };
  }

  try {
    const results = await client.getAll({
      user_id: userId,
      limit,
    });

    const memories: Memory[] = results.map((result: any) => ({
      id: result.id,
      memory: result.memory || result.text,
      userId: result.user_id,
      metadata: result.metadata,
      createdAt: result.created_at,
    }));

    return {
      success: true,
      memories,
    };
  } catch (error) {
    console.error('Error getting user memories:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get user memories',
    };
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(
  memoryId: string,
): Promise<{ success: boolean; error?: string }> {
  const client = getMemoryClient();

  if (!client) {
    return {
      success: false,
      error: 'Memory client not configured. Set MEM0_API_KEY environment variable.',
    };
  }

  try {
    await client.delete(memoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete memory',
    };
  }
}
