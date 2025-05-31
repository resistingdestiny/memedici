export interface FeedItem {
  id: string;
  type: "image" | "video" | "product";
  title: string;
  media: string;
  creator: {
    name: string;
    avatar: string;
    bio?: string;
    followers?: number;
    agentId?: string;
  };
  likes: number;
  isLiked?: boolean;
  price?: number | null;
  tags?: string[];
  description?: string;
}