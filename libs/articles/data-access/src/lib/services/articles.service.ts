// libs/articles/data-access/src/lib/services/articles.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@realworld/core/http-client';
import { Article, ArticleResponse, MultipleCommentsResponse, SingleCommentResponse } from '@realworld/core/api-types';
import { ArticleListConfig } from '../+state/article-list/article-list.reducer';
import { HttpParams } from '@angular/common/http';

// Define the expected shape of the article data for creation and update payloads
// This aligns with what the backend's CreateArticleDto likely expects.
interface ArticleDataPayload {
  title: string;
  description: string;
  body: string;
  tagList: string[];
}

interface PartialArticleDataPayload {
  title?: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  constructor(private apiService: ApiService) {}

  getArticle(slug: string): Observable<ArticleResponse> {
    return this.apiService.get<ArticleResponse>('/articles/' + slug);
  }

  getComments(slug: string): Observable<MultipleCommentsResponse> {
    return this.apiService.get<MultipleCommentsResponse>(`/articles/${slug}/comments`);
  }

  deleteArticle(slug: string): Observable<void> {
    return this.apiService.delete<void>('/articles/' + slug);
  }

  deleteComment(commentId: number, slug: string): Observable<void> {
    return this.apiService.delete<void>(`/articles/${slug}/comments/${commentId}`);
  }

  addComment(slug: string, payload = ''): Observable<SingleCommentResponse> {
    return this.apiService.post<SingleCommentResponse, { comment: { body: string } }>(`/articles/${slug}/comments`, {
      comment: { body: payload },
    });
  }

  query(config: ArticleListConfig): Observable<{ articles: Article[]; articlesCount: number }> {
    return this.apiService.get(
      '/articles' + (config.type === 'FEED' ? '/feed' : ''),
      this.toHttpParams(config.filters),
    );
  }

  publishArticle(article: Article): Observable<ArticleResponse> {
    // `article.tagList` is typed as `string[]` in the Article interface.
    // However, if a form binds a simple text input directly to it,
    // `article.tagList` might arrive here as a single string at runtime.
    // We process it robustly to ensure it's always a string[] of trimmed, non-empty tags.
    const rawTagInput = article.tagList as any; // Acknowledge potential runtime type mismatch
    let processedTagList: string[] = [];

    if (typeof rawTagInput === 'string') {
      if (rawTagInput.trim() !== '') {
        processedTagList = rawTagInput
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0); // Filter out empty strings
      }
    } else if (Array.isArray(rawTagInput)) {
      // If it's already an array (e.g., from a more advanced form component),
      // still good to ensure all elements are strings, trim them, and filter empty ones.
      processedTagList = rawTagInput
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => (tag as string).trim());
    }
    // If rawTagInput is null, undefined, or any other type, processedTagList remains [], which is fine.

    if (article.slug) {
      // UPDATE Case (existing article)
      // Backend DTO for update is likely CreateArticleDto (or a similar UpdateArticleDto)
      // which expects optional fields for title, description, body, and tagList.
      const articleDataForUpdate: PartialArticleDataPayload = {
        // Only include fields if they are present in the input `article` and intended for update.
        // For simplicity here, we're assuming if `article.title` exists, it's meant to be updated.
        // A more sophisticated approach might check which fields have actually changed.
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: processedTagList, // Send the processed tag list
      };

      return this.apiService.put<ArticleResponse, { article: PartialArticleDataPayload }>(
        `/articles/${article.slug}`,
        { article: articleDataForUpdate },
      );
    } else {
      // CREATE Case for new article - THIS BLOCK FIXES PROBLEM 1
      // Backend DTO for create (CreateArticleDto) expects title, description, body, and tagList.
      const articleDataForCreation: ArticleDataPayload = {
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: processedTagList, // Use the processed string array
      };

      return this.apiService.post<ArticleResponse, { article: ArticleDataPayload }>(
        '/articles/',
        { article: articleDataForCreation },
      );
    }
  }

  // toHttpParams remains unchanged.
  // TODO: remove any
  private toHttpParams(params: any) {
    return Object.getOwnPropertyNames(params).reduce((p, key) => p.set(key, params[key]), new HttpParams());
  }
}
