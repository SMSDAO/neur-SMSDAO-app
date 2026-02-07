/**
 * Twitter Search Integration
 * Provides functionality for searching and analyzing tweets
 */

export interface TwitterSearchParams {
  query: string;
  maxResults?: number;
}

export interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    name: string;
  };
  createdAt: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface TwitterSearchResult {
  success: boolean;
  tweets?: Tweet[];
  error?: string;
}

/**
 * Search tweets using Twitter API
 * Note: Requires TWITTER_BEARER_TOKEN environment variable
 */
export async function searchTweets(
  params: TwitterSearchParams,
): Promise<TwitterSearchResult> {
  const { query, maxResults = 10 } = params;
  
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  if (!bearerToken) {
    return {
      success: false,
      error: 'Twitter API credentials not configured',
    };
  }

  try {
    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.append('query', query);
    url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    url.searchParams.append('tweet.fields', 'created_at,public_metrics,author_id');
    url.searchParams.append('expansions', 'author_id');
    url.searchParams.append('user.fields', 'username,name');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    // Map users by ID for easy lookup
    const usersById = new Map();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        usersById.set(user.id, user);
      }
    }

    // Format tweets
    const tweets: Tweet[] = (data.data || []).map((tweet: any) => {
      const author = usersById.get(tweet.author_id) || {
        id: tweet.author_id,
        username: 'unknown',
        name: 'Unknown User',
      };

      return {
        id: tweet.id,
        text: tweet.text,
        author: {
          id: author.id,
          username: author.username,
          name: author.name,
        },
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics
          ? {
              likes: tweet.public_metrics.like_count || 0,
              retweets: tweet.public_metrics.retweet_count || 0,
              replies: tweet.public_metrics.reply_count || 0,
            }
          : undefined,
      };
    });

    return {
      success: true,
      tweets,
    };
  } catch (error) {
    console.error('Error searching tweets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search tweets',
    };
  }
}

/**
 * Get tweets from a specific user
 */
export async function getUserTweets(
  username: string,
  maxResults: number = 10,
): Promise<TwitterSearchResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  if (!bearerToken) {
    return {
      success: false,
      error: 'Twitter API credentials not configured',
    };
  }

  try {
    // First get user ID
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Get user tweets
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    url.searchParams.append('tweet.fields', 'created_at,public_metrics');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();

    const tweets: Tweet[] = (data.data || []).map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      author: {
        id: userId,
        username,
        name: userData.data.name,
      },
      createdAt: tweet.created_at,
      metrics: tweet.public_metrics
        ? {
            likes: tweet.public_metrics.like_count || 0,
            retweets: tweet.public_metrics.retweet_count || 0,
            replies: tweet.public_metrics.reply_count || 0,
          }
        : undefined,
    }));

    return {
      success: true,
      tweets,
    };
  } catch (error) {
    console.error('Error fetching user tweets:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch user tweets',
    };
  }
}
