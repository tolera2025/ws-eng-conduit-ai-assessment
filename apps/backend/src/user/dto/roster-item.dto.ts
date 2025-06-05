export class RosterItemDto {
  username: string;
  image: string | null;
  bio: string | null;
  articleCount: number;
  totalFavoritesReceived: number;
  firstArticleDate: Date | null;
}
