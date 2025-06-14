// apps/backend/src/article/comment.entity.ts
import { Entity, ManyToOne, PrimaryKey, Property, wrap, EntityDTO } from '@mikro-orm/core';
import { User } from '../user/user.entity';
import { Article } from './article.entity';

// Define the DTO for the User's author information as it will appear in CommentDTO
// This assumes User.toJSON() returns an object compatible with UserDTO from user.entity.ts
// If User.toJSON() returns something else, adjust this type.
type CommentAuthorDTO = ReturnType<User['toJSON']>; // This will be UserDTO from user.entity.ts

// Define CommentDTO with the final shape *after* toJSON processing.
// It still uses EntityDTO for the base properties from the Comment entity.
export interface CommentDTO extends Omit<EntityDTO<Comment>, 'author' | 'article'> { // Omit original complex types
  author?: CommentAuthorDTO; // Author will be of the type returned by User.toJSON()
  // 'article' is intentionally omitted as we delete it in toJSON
}

@Entity()
export class Comment {
  @PrimaryKey()
  id!: number;

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: 'text' })
  body!: string;

  @ManyToOne(() => Article)
  article!: Article;

  @ManyToOne(() => User)
  author!: User;

  constructor(author: User, article: Article, body: string) {
    this.author = author;
    this.article = article;
    this.body = body;
  }

  toJSON(currentUser?: User): CommentDTO {
    const baseObject = wrap<Comment>(this).toObject(); // Gets all primitive properties
    
    const dto: CommentDTO = {
        ...baseObject, // Spread primitive properties
        // author and article will be handled next
    };

    // Serialize author
    if (this.author && wrap(this.author).isInitialized() && typeof this.author.toJSON === 'function') {
      dto.author = this.author.toJSON(currentUser);
    } else if (this.author) {
      // Fallback minimal profile if not fully initialized or no toJSON
      dto.author = {
        username: this.author.username,
        bio: this.author.bio,
        image: this.author.image || 'https://static.productionready.io/images/smiley-cyrus.jpg', // Ensure image has a fallback if User.toJSON doesn't handle it
        following: !!(currentUser && currentUser.followed.isInitialized() && currentUser.followed.contains(this.author)), // Re-evaluate 'following' logic based on context
      } as any; // Cast or use a specific minimal author DTO type
    } else {
      delete dto.author; // Or explicitly set dto.author = undefined;
    }

    // 'article' is already omitted from CommentDTO type definition
    // delete (dto as any).article; // No longer needed due to Omit

    return dto;
  }
}
