import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EntityManager, QueryOrder, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';

import { User } from '../user/user.entity';
import { Article } from './article.entity';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { Comment } from './comment.entity';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { Tag } from '../tag/tag.entity';

@Injectable()
export class ArticleService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Article)
    private readonly articleRepository: EntityRepository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: EntityRepository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Tag)
    private readonly tagRepository: EntityRepository<Tag>,
  ) {}

  async findAll(userId: number | undefined, query: Record<string, string>): Promise<IArticlesRO> {
    const currentUser = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;

    const qb = this.articleRepository.createQueryBuilder('a')
      .select('a.*')
      .leftJoin('a.author', 'u');

    if ('tag' in query && typeof query.tag === 'string' && query.tag.trim() !== '') {
      const normalizedQueryTag = query.tag.trim().toLowerCase();
      qb.andWhere({ tagList: { $like: `%${normalizedQueryTag}%` } });
    }

    if ('author' in query && typeof query.author === 'string' && query.author.trim() !== '') {
      const author = await this.userRepository.findOne({ username: query.author.trim() });
      if (!author) {
        return { articles: [], articlesCount: 0 };
      }
      qb.andWhere({ author: author.id });
    }

    if ('favorited' in query && typeof query.favorited === 'string' && query.favorited.trim() !== '') {
      const favoriter = await this.userRepository.findOne({ username: query.favorited.trim() }, { populate: ['favorites'] });
      if (!favoriter || favoriter.favorites.count() === 0) {
        return { articles: [], articlesCount: 0 };
      }
      const ids = favoriter.favorites.getIdentifiers('id');
      qb.andWhere({ id: { $in: ids } });
    }

    qb.orderBy({ createdAt: QueryOrder.DESC });

    const countQb = qb.clone().count('id', true);
    const countResult = await countQb.execute('get');
    const articlesCount = countResult?.count || 0;


    if ('limit' in query && !isNaN(parseInt(query.limit, 10))) {
      qb.limit(+query.limit);
    } else {
      qb.limit(20);
    }

    if ('offset' in query && !isNaN(parseInt(query.offset, 10))) {
      qb.offset(+query.offset);
    } else {
      qb.offset(0);
    }

    const articles = await qb.getResultList();
    return { articles: articles.map((a) => a.toJSON(currentUser ?? undefined)), articlesCount };
  }

  async findFeed(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const currentUser = await this.userRepository.findOneOrFail(userId, { populate: ['followers', 'favorites'] });

    const followedAuthorIds = currentUser.followers.getIdentifiers('id');
    if (followedAuthorIds.length === 0) {
      return { articles: [], articlesCount: 0 };
    }

    const [articles, articlesCount] = await this.articleRepository.findAndCount(
      { author: { id: { $in: followedAuthorIds } } },
      {
        populate: ['author'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: +query.limit || 20,
        offset: +query.offset || 0,
      },
    );
    return { articles: articles.map((a) => a.toJSON(currentUser)), articlesCount };
  }

  async findOne(userId: number | undefined, slug: string): Promise<IArticleRO> {
    const currentUser = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;

    const article = await this.articleRepository.findOne({ slug }, { populate: ['author'] });
    if (!article) {
      throw new NotFoundException(`Article with slug "${slug}" not found.`);
    }
    return { article: article.toJSON(currentUser ?? undefined) };
  }

  async addComment(currentUserId: number, slug: string, dto: CreateCommentDto): Promise<{ comment: ReturnType<Comment['toJSON']>, article: IArticleRO['article'] }> {
    const articleEntity = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const commentAuthor = await this.userRepository.findOneOrFail(currentUserId);

    const comment = new Comment(commentAuthor, articleEntity, dto.body);
    await this.em.persistAndFlush(comment);

    return {
        comment: comment.toJSON(commentAuthor),
        article: articleEntity.toJSON(commentAuthor)
    };
  }

  async deleteComment(currentUserId: number, slug: string, commentId: number): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author', 'comments', 'comments.author'] });
    const currentUser = await this.userRepository.findOneOrFail(currentUserId); // The user performing the action

    // Fetch the specific comment related to the article
    const comment = await this.commentRepository.findOne({ id: commentId, article: article.id }, { populate: ['author'] });


    if (!comment) {
        throw new NotFoundException(`Comment with ID ${commentId} not found on article "${slug}".`);
    }

    if (comment.author.id !== currentUserId) {
        throw new ForbiddenException(`User is not authorized to delete this comment.`);
    }

    if (article.comments.isInitialized() && article.comments.contains(comment)) {
        article.comments.remove(comment);
    }
    await this.em.removeAndFlush(comment);

    return { article: article.toJSON(currentUser) }; // Return article from perspective of currentUser
  }

  async favorite(currentUserId: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const currentUser = await this.userRepository.findOneOrFail(currentUserId, { populate: ['favorites', 'followers'] });

    if (!currentUser.favorites.contains(article)) {
      currentUser.favorites.add(article);
      article.favoritesCount = (article.favoritesCount || 0) + 1;
    }
    await this.em.flush();
    return { article: article.toJSON(currentUser) };
  }

  async unFavorite(currentUserId: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const currentUser = await this.userRepository.findOneOrFail(currentUserId, { populate: ['followers', 'favorites'] });

    if (currentUser.favorites.contains(article)) {
      currentUser.favorites.remove(article);
      article.favoritesCount = Math.max(0, (article.favoritesCount || 0) - 1);
    }
    await this.em.flush();
    return { article: article.toJSON(currentUser) };
  }

  async findComments(userId: number | undefined, slug: string): Promise<ICommentsRO> {
    const currentUser = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;

    const article = await this.articleRepository.findOne(
        { slug },
        { populate: ['author', 'comments', 'comments.author'] }
    );

    if (!article) {
        throw new NotFoundException(`Article with slug "${slug}" not found when fetching comments.`);
    }
    return {
        comments: article.comments.getItems().map(comment => comment.toJSON(currentUser ?? undefined))
    };
  }

  async create(authorId: number, dto: CreateArticleDto): Promise<IArticleRO> {
    const author = await this.userRepository.findOneOrFail({ id: authorId });

    const article = new Article(author, dto.title, dto.description, dto.body);
    article.tagList = []; // Initialize tagList

    if (dto.tagList && Array.isArray(dto.tagList) && dto.tagList.length > 0) {
      const uniqueUserEnteredTags: string[] = [...new Set(
        dto.tagList
          .map((tag: string) => tag.trim()) // Keep original case for creating Tag entities if needed, or lowercase here
          .filter((tag: string) => tag.length > 0)
      )];

      // Store normalized (e.g., lowercase) tags in article.tagList
      article.tagList.push(...uniqueUserEnteredTags.map(tag => tag.toLowerCase()));

      for (const tagName of uniqueUserEnteredTags) { // Iterate over the (potentially mixed-case) unique tags
        const normalizedTagName = tagName.toLowerCase(); // Normalize for DB lookup/storage of Tag entity
        let tagEntity = await this.tagRepository.findOne({ tag: normalizedTagName });
        if (!tagEntity) {
          tagEntity = this.tagRepository.create({ tag: normalizedTagName });
          this.em.persist(tagEntity);
        }
      }
    }

    this.em.persist(article);
    await this.em.flush();

    return { article: article.toJSON(author) };
  }

  async update(currentUserId: number, slug: string, articleData: CreateArticleDto): Promise<IArticleRO> {
    const currentUser = await this.userRepository.findOneOrFail({ id: currentUserId });
    const article = await this.articleRepository.findOne({ slug, author: currentUser.id }, { populate: ['author'] });

    if (!article) {
        throw new NotFoundException(`Article with slug "${slug}" not found or user not authorized to update.`);
    }

    if (typeof articleData.tagList !== 'undefined') {
        article.tagList = []; // Clear existing tags for replacement
        if (Array.isArray(articleData.tagList) && articleData.tagList.length > 0) {
            const uniqueUserEnteredTags: string[] = [...new Set(
                articleData.tagList
                    .map((tag: string) => tag.trim())
                    .filter((tag: string) => tag.length > 0)
            )];

            article.tagList.push(...uniqueUserEnteredTags.map(tag => tag.toLowerCase()));

            for (const tagName of uniqueUserEnteredTags) {
                const normalizedTagName = tagName.toLowerCase();
                let tagEntity = await this.tagRepository.findOne({ tag: normalizedTagName });
                if (!tagEntity) {
                    tagEntity = this.tagRepository.create({ tag: normalizedTagName });
                    this.em.persist(tagEntity);
                }
            }
        }
    }

    const { tagList, ...otherDataToUpdate } = articleData;
    wrap(article).assign(otherDataToUpdate);

    await this.em.flush();
    return { article: article.toJSON(currentUser) };
  }

  async delete(currentUserId: number, slug: string): Promise<void> {
    const article = await this.articleRepository.findOne({ slug, author: currentUserId });
    if (!article) {
        throw new NotFoundException(`Article with slug "${slug}" not found or user not authorized to delete.`);
    }
    await this.em.removeAndFlush(article);
  }
}