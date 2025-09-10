import { InsertProblem } from "@shared/schema";

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  created_utc: number;
  score: number;
  subreddit: string;
  author: string;
  author_comment_karma?: number;
  author_link_karma?: number;
}

export async function fetchRedditData(subreddits: string[] = ['LifeProTips', 'mildlyinfuriating', 'YouShouldKnow']): Promise<InsertProblem[]> {
  const problems: InsertProblem[] = [];
  
  for (const subreddit of subreddits) {
    try {
      // Using Reddit's JSON API (no authentication required for public posts)
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
        headers: {
          'User-Agent': 'CollectiveProblems/1.0.0 (Problem Collection Platform)'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch from r/${subreddit}:`, response.statusText);
        continue;
      }
      
      const data = await response.json();
      const posts = data.data?.children || [];
      
      for (const postWrapper of posts) {
        const post: RedditPost = postWrapper.data;
        
        // Filter for text posts that describe problems
        if (post.selftext && post.selftext.length > 50 && !post.selftext.includes('[removed]') && !post.selftext.includes('[deleted]')) {
          const problemText = `${post.title}\n\n${post.selftext}`;
          
          problems.push({
            source: 'Reddit',
            subreddit: post.subreddit,
            authorUsername: post.author,
            authorKarma: (post.author_link_karma || 0) + (post.author_comment_karma || 0),
            originalText: problemText,
            summary: null,
            keywords: null,
            category: null,
            score: post.score,
            processed: false,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching from r/${subreddit}:`, error);
    }
  }
  
  return problems;
}
