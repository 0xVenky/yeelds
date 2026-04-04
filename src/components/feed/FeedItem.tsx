import type { FeedItem as FeedItemType } from "@/lib/feed/types";
import { TweetCard } from "./TweetCard";
import { ArticleCard } from "./ArticleCard";
import { SubstackCard } from "./SubstackCard";

export function FeedItem({ item }: { item: FeedItemType }) {
  switch (item.type) {
    case "tweet":
      return <TweetCard item={item} />;
    case "article":
      return <ArticleCard item={item} />;
    case "substack":
      return <SubstackCard item={item} />;
  }
}
