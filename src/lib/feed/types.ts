export type FeedItemType = "tweet" | "article" | "substack";

type BaseFeedItem = {
  id: string;
  type: FeedItemType;
  published_at: string; // ISO date
};

export type TweetItem = BaseFeedItem & {
  type: "tweet";
  author_name: string;
  author_handle: string;
  author_avatar?: string;
  text: string;
  likes: number;
  retweets: number;
  url: string;
};

export type ArticleItem = BaseFeedItem & {
  type: "article";
  source: string;
  title: string;
  excerpt: string;
  author: string;
  read_time_min: number;
  url: string;
  thumbnail?: string;
};

export type SubstackItem = BaseFeedItem & {
  type: "substack";
  publication: string;
  author: string;
  title: string;
  excerpt: string;
  url: string;
};

export type FeedItem = TweetItem | ArticleItem | SubstackItem;
