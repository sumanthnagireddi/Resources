import { Injectable, resource, Resource } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BlogsService {

  blogs_endpoint: any = environment.API_URL + '/blogs';
  constructor(private http: HttpClient) { }

  getBlogsFromMongo() {
    return this.http.get(this.blogs_endpoint);
  }
  addBlogToMongo(blog_payload: any) {
    const titleSource = blog_payload?.title ?? blog_payload?.name ?? 'untitled-post';
    const payload = {
      ...blog_payload,
      slug: titleSource
        ?.trim() // remove leading/trailing spaces
        .toLowerCase() // convert to lowercase
        .replace(/\s+/g, '-') // replace spaces (one or more) with hyphens
        .replace(/[^a-z0-9-]/g, ''), // optional: remove special characters
    };

    return this.http.post(this.blogs_endpoint, payload);
  }

  getBlogById(blogId: string) {
    return this.http.get(`${this.blogs_endpoint}/${blogId}`);
  }
}
