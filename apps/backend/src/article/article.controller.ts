import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ParseIntPipe,
  UseGuards, // Recommended for protected routes
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User as UserDecorator } from '../user/user.decorator'; // Renamed to avoid conflict if User entity is imported
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface'; // Ensure IArticleRO is imported for return types
import { ArticleService } from './article.service';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { Comment } from './comment.entity'; // For ReturnType<Comment['toJSON']>
// import { YourAuthGuard } from '../auth/your-auth.guard'; // Example guard

@ApiBearerAuth()
@ApiTags('articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({ status: 200, description: 'Return all articles.' })
  @Get()
  async findAll(
    @UserDecorator('id') userId: number | undefined,
    @Query() query: Record<string, string>,
  ): Promise<IArticlesRO> {
    return this.articleService.findAll(userId, query);
  }

  @ApiOperation({ summary: 'Get article feed' })
  @ApiResponse({ status: 200, description: 'Return article feed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Get('feed')
  // @UseGuards(YourAuthGuard) // Protect this route if needed
  async getFeed(
    @UserDecorator('id') userId: number,
    @Query() query: Record<string, string>,
  ): Promise<IArticlesRO> {
    return this.articleService.findFeed(userId, query);
  }

  @ApiOperation({ summary: 'Get a single article by slug' })
  @ApiResponse({ status: 200, description: 'Return a single article.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Get(':slug')
  async findOne(
    @UserDecorator('id') userId: number | undefined,
    @Param('slug') slug: string,
  ): Promise<IArticleRO> {
    return this.articleService.findOne(userId, slug);
  }

  @ApiOperation({ summary: 'Get comments for an article' })
  @ApiResponse({ status: 200, description: 'Return comments for an article.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Get(':slug/comments')
  async findComments(
    @UserDecorator('id') userId: number | undefined,
    @Param('slug') slug: string,
  ): Promise<ICommentsRO> {
    return this.articleService.findComments(userId, slug);
  }

  @ApiOperation({ summary: 'Create article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Post()
  // @UseGuards(YourAuthGuard) // Protect this route
  async create(
    @UserDecorator('id') userId: number,
    @Body('article') articleData: CreateArticleDto,
  ): Promise<IArticleRO> {
    return this.articleService.create(userId, articleData);
  }

  @ApiOperation({ summary: 'Update article' })
  @ApiResponse({ status: 200, description: 'The article has been successfully updated.'})
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the author).'})
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Put(':slug')
  // @UseGuards(YourAuthGuard) // Protect this route
  async update(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
    @Body('article') articleData: CreateArticleDto,
  ): Promise<IArticleRO> {
    return this.articleService.update(userId, slug, articleData);
  }

  @ApiOperation({ summary: 'Delete article' })
  @ApiResponse({ status: 204, description: 'The article has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the author).'})
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Delete(':slug')
  // @UseGuards(YourAuthGuard) // Protect this route
  async delete(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
  ): Promise<void> {
    return this.articleService.delete(userId, slug);
  }

  @ApiOperation({ summary: 'Create comment for an article' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully created.' }) // Returns {comment, article}
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Post(':slug/comments')
  // @UseGuards(YourAuthGuard) // Protect this route
  async createComment(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
    @Body('comment') commentData: CreateCommentDto,
  ): Promise<{ comment: ReturnType<Comment['toJSON']>, article: IArticleRO['article'] }> { // Match service return type
    return this.articleService.addComment(userId, slug, commentData);
  }

  @ApiOperation({ summary: 'Delete a comment from an article' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully deleted and the article is returned.'}) // Status 200 as content is returned
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the comment author).'})
  @ApiResponse({ status: 404, description: 'Article or comment not found.' })
  @Delete(':slug/comments/:id')
  // @UseGuards(YourAuthGuard) // Protect this route
  async deleteComment(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) commentId: number,
  ): Promise<IArticleRO> { // <--- FIX APPLIED HERE
    return this.articleService.deleteComment(userId, slug, commentId);
  }

  @ApiOperation({ summary: 'Favorite an article' })
  @ApiResponse({ status: 200, description: 'The article has been successfully favorited/unfavorited.'})
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Post(':slug/favorite')
  // @UseGuards(YourAuthGuard) // Protect this route
  async favorite(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
  ): Promise<IArticleRO> {
    return this.articleService.favorite(userId, slug);
  }

  @ApiOperation({ summary: 'Unfavorite an article' })
  @ApiResponse({ status: 200, description: 'The article has been successfully favorited/unfavorited.'})
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @Delete(':slug/favorite')
  // @UseGuards(YourAuthGuard) // Protect this route
  async unFavorite(
    @UserDecorator('id') userId: number,
    @Param('slug') slug: string,
  ): Promise<IArticleRO> {
    return this.articleService.unFavorite(userId, slug);
  }
}