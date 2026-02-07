import { z } from 'zod';

export const memoryTools = {
  addMemory: {
    displayName: '🧠 Store Memory',
    isCollapsible: true,
    description:
      'Store information in the agent\'s long-term memory. Use this to remember important user preferences, facts, or context for future conversations.',
    parameters: z.object({
      message: z.string().describe('The information to remember'),
      metadata: z
        .record(z.any())
        .optional()
        .describe('Optional metadata to associate with the memory'),
    }),
    requiredEnvVars: ['MEM0_API_KEY'],
    execute: async ({
      message,
      metadata,
    }: {
      message: string;
      metadata?: Record<string, any>;
    }, context?: { userId?: string }) => {
      try {
        const { addMemory } = await import('@/lib/memory');
        
        if (!context?.userId) {
          return {
            success: false,
            error: 'User ID not available',
          };
        }

        const result = await addMemory(message, context.userId, metadata);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to store memory',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        memoryId?: string;
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {typedResult.error || 'Failed to store memory'}
            </p>
          </div>
        );
      }

      return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ Memory stored successfully
          </p>
        </div>
      );
    },
  },

  searchMemories: {
    displayName: '🔍 Search Memories',
    isCollapsible: true,
    description:
      'Search through stored memories to recall information from previous conversations. Returns relevant memories based on the search query.',
    parameters: z.object({
      query: z.string().describe('What to search for in memories'),
      limit: z
        .number()
        .optional()
        .default(5)
        .describe('Maximum number of memories to return'),
    }),
    requiredEnvVars: ['MEM0_API_KEY'],
    execute: async ({
      query,
      limit,
    }: {
      query: string;
      limit?: number;
    }, context?: { userId?: string }) => {
      try {
        const { searchMemories } = await import('@/lib/memory');
        
        if (!context?.userId) {
          return {
            success: false,
            error: 'User ID not available',
          };
        }

        const result = await searchMemories(query, context.userId, limit);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search memories',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        memories?: any[];
        error?: string;
      };

      if (!typedResult.success || !typedResult.memories) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {typedResult.error || 'Failed to search memories'}
            </p>
          </div>
        );
      }

      if (typedResult.memories.length === 0) {
        return (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              No memories found matching your query
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {typedResult.memories.map((memory: any) => (
            <div
              key={memory.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-sm">{memory.memory}</p>
              {memory.createdAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    },
  },

  getAllMemories: {
    displayName: '📚 Get All Memories',
    isCollapsible: true,
    description:
      'Retrieve all stored memories for the current user. Useful for reviewing conversation history and context.',
    parameters: z.object({
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of memories to return'),
    }),
    requiredEnvVars: ['MEM0_API_KEY'],
    execute: async ({
      limit,
    }: {
      limit?: number;
    }, context?: { userId?: string }) => {
      try {
        const { getUserMemories } = await import('@/lib/memory');
        
        if (!context?.userId) {
          return {
            success: false,
            error: 'User ID not available',
          };
        }

        const result = await getUserMemories(context.userId, limit);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get memories',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        memories?: any[];
        error?: string;
      };

      if (!typedResult.success || !typedResult.memories) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {typedResult.error || 'Failed to get memories'}
            </p>
          </div>
        );
      }

      if (typedResult.memories.length === 0) {
        return (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">No memories stored yet</p>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {typedResult.memories.length} memories found
          </p>
          {typedResult.memories.map((memory: any) => (
            <div
              key={memory.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-sm">{memory.memory}</p>
              {memory.createdAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    },
  },
};
