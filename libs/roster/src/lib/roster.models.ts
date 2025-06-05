export interface RosterItem {
  username: string;
  image: string | null;
  bio: string | null;
  articleCount: number;
  totalFavoritesReceived: number;
  firstArticleDate: string | null;
}
