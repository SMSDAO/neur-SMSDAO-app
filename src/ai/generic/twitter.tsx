import { z } from 'zod';

export const twitterSearchTools = {
  searchTweets: {
    displayName: '🐦 Search Tweets',
    isCollapsible: true,
    description:
      'Search recent tweets on Twitter/X by keyword or hashtag. Returns recent tweets matching the query with author information and engagement metrics.',
    parameters: z.object({
      query: z
        .string()
        .describe(
          'Search query (keywords, hashtags, or advanced Twitter search syntax)',
        ),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of tweets to return (max 100)'),
    }),
    requiredEnvVars: ['TWITTER_BEARER_TOKEN'],
    execute: async ({
      query,
      maxResults,
    }: {
      query: string;
      maxResults?: number;
    }) => {
      try {
        const { searchTweets } = await import('@/lib/twitter');
        const result = await searchTweets({ query, maxResults });
        return result;
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to search tweets',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        tweets?: any[];
        error?: string;
      };

      if (!typedResult.success || !typedResult.tweets) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {typedResult.error || 'Failed to search tweets'}
            </p>
          </div>
        );
      }

      if (typedResult.tweets.length === 0) {
        return (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">No tweets found</p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {typedResult.tweets.map((tweet: any) => (
            <div
              key={tweet.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold">{tweet.author.name}</span>
                <span className="text-sm text-muted-foreground">
                  @{tweet.author.username}
                </span>
              </div>
              <p className="mb-3 text-sm">{tweet.text}</p>
              {tweet.metrics && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>❤️ {tweet.metrics.likes}</span>
                  <span>🔁 {tweet.metrics.retweets}</span>
                  <span>💬 {tweet.metrics.replies}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
  },

  getUserTweets: {
    displayName: '👤 Get User Tweets',
    isCollapsible: true,
    description:
      'Get recent tweets from a specific Twitter/X user by their username.',
    parameters: z.object({
      username: z.string().describe('Twitter username (without @)'),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of tweets to return (max 100)'),
    }),
    requiredEnvVars: ['TWITTER_BEARER_TOKEN'],
    execute: async ({
      username,
      maxResults,
    }: {
      username: string;
      maxResults?: number;
    }) => {
      try {
        const { getUserTweets } = await import('@/lib/twitter');
        const result = await getUserTweets(username, maxResults);
        return result;
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get user tweets',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        tweets?: any[];
        error?: string;
      };

      if (!typedResult.success || !typedResult.tweets) {
        return (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              {typedResult.error || 'Failed to get user tweets'}
            </p>
          </div>
        );
      }

      if (typedResult.tweets.length === 0) {
        return (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              No tweets found for this user
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {typedResult.tweets.map((tweet: any) => (
            <div
              key={tweet.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="mb-3 text-sm">{tweet.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(tweet.createdAt).toLocaleDateString()}
                </span>
                {tweet.metrics && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>❤️ {tweet.metrics.likes}</span>
                    <span>🔁 {tweet.metrics.retweets}</span>
                    <span>💬 {tweet.metrics.replies}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
};
