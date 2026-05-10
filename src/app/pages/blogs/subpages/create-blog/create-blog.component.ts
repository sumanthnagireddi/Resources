import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  AtlasEditorComponent,
  AtlasEditorDocumentChangeDetail,
} from '../../../../component/editor/editor.component';
import { AiService } from '../../../../services/ai.service';
import { BlogsService } from '../../../../services/blogs.service';
import { TechnologyService } from '../../../../services/technology.service';

type ComposerMode = 'ai' | 'manual';
type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';

type ToneOption = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-create-blog',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AtlasEditorComponent],
  templateUrl: './create-blog.component.html',
  styleUrl: './create-blog.component.css',
})
export class CreateBlogComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly blogsService = inject(BlogsService);
  private readonly technologyService = inject(TechnologyService);
  private readonly aiService = inject(AiService);

  readonly toneOptions: ToneOption[] = [
    { label: 'Friendly', value: 'friendly' },
    { label: 'Confident', value: 'confident' },
    { label: 'Technical', value: 'technical' },
    { label: 'Executive', value: 'executive' },
  ];

  readonly blogForm = this.formBuilder.group({
    title: ['', Validators.required],
    description: [''],
    category: [''],
    tags: [''],
    status: ['DRAFT' as BlogStatus, Validators.required],
    publishedAt: [''],
  });

  readonly aiForm = this.formBuilder.group({
    targetAudience: ['Frontend teams, product designers, and engineering managers'],
    keyPoints: ['Add practical takeaways, real examples, and a clear structure.'],
    examples: ['Reference workflows, collaboration habits, and measurable outcomes.'],
    tone: ['friendly'],
  });

  categories: string[] = [];
  composerMode: ComposerMode = 'ai';
  editorDocument: Record<string, unknown> = this.createEmptyDocument();
  editorSerialized = JSON.stringify(this.createEmptyDocument());
  editorPlainText = '';
  editorMounted = true;
  isGenerating = false;
  isSaving = false;
  saveNotice = 'Draft is ready for you to shape.';
  saveError: string | null = null;
  generationError: string | null = null;

  private generationSubscription: Subscription | null = null;
  private generatedDraftBuffer = '';

  ngOnInit(): void {
    this.technologyService
      .getTechnologiesFromMongo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const technologies = Array.isArray(response) ? response : [];
          this.categories = technologies
            .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
            .filter(Boolean);
        },
        error: () => {
          this.categories = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.generationSubscription?.unsubscribe();
  }

  get statusValue(): BlogStatus {
    return (this.blogForm.controls.status.value as BlogStatus) ?? 'DRAFT';
  }

  get titleInvalid(): boolean {
    const control = this.blogForm.controls.title;
    return control.invalid && (control.dirty || control.touched);
  }

  get tagPreview(): string[] {
    return this.parseTags(this.blogForm.controls.tags.value);
  }

  get editorWordCount(): number {
    return this.editorPlainText.split(/\s+/).filter(Boolean).length;
  }

  get draftSummary(): string {
    const characters = this.editorPlainText.trim().length;

    if (!characters) {
      return 'Empty draft';
    }

    return `${this.editorWordCount} words / ${characters} characters`;
  }

  setComposerMode(mode: ComposerMode): void {
    this.composerMode = mode;
    this.generationError = null;
  }

  handleDocumentChange(detail: AtlasEditorDocumentChangeDetail): void {
    this.editorDocument = this.normalizeDocument(detail.adf);
    this.editorSerialized = detail.serialized || JSON.stringify(this.editorDocument);
    this.editorPlainText = this.extractText(this.editorDocument);
    this.saveError = null;
    this.saveNotice = this.editorPlainText.trim()
      ? 'Changes are ready to save.'
      : 'Start writing or generate a first draft.';
  }

  generateDraft(): void {
    if (this.isGenerating) {
      return;
    }

    this.setComposerMode('ai');
    this.generationError = null;
    this.saveError = null;
    this.isGenerating = true;
    this.saveNotice = 'Generating a draft for the editor...';
    this.generatedDraftBuffer = '';

    this.generationSubscription?.unsubscribe();
    this.generationSubscription = this.aiService
      .askStream(this.buildAiPrompt())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (token) => {
          this.generatedDraftBuffer += token;
        },
        error: () => {
          this.isGenerating = false;
          this.generationError =
            'The AI draft could not be generated right now. You can keep writing manually.';
          this.saveNotice = 'Generation failed.';
        },
        complete: () => {
          this.isGenerating = false;

          if (!this.generatedDraftBuffer.trim()) {
            this.generationError = 'The AI response came back empty. Try a more specific prompt.';
            this.saveNotice = 'No draft was inserted.';
            return;
          }

          this.applyGeneratedDraft(this.generatedDraftBuffer);
        },
      });
  }

  stopGeneration(): void {
    if (!this.isGenerating) {
      return;
    }

    this.generationSubscription?.unsubscribe();
    this.isGenerating = false;

    if (this.generatedDraftBuffer.trim()) {
      this.applyGeneratedDraft(this.generatedDraftBuffer);
      this.saveNotice = 'Partial AI draft inserted into the editor.';
      return;
    }

    this.saveNotice = 'Generation stopped.';
  }

  saveDraft(): void {
    this.persistBlog();
  }

  publishBlog(): void {
    this.persistBlog('PUBLISHED');
  }

  private persistBlog(forcedStatus?: BlogStatus): void {
    if (this.isSaving) {
      return;
    }

    if (!this.blogForm.controls.title.value?.trim()) {
      this.blogForm.controls.title.markAsTouched();
      this.saveError = 'Add a title before saving the post.';
      return;
    }

    if (
      (forcedStatus ?? this.statusValue) === 'SCHEDULED' &&
      !this.blogForm.controls.publishedAt.value?.trim()
    ) {
      this.saveError = 'Choose a publish time before scheduling this post.';
      this.blogForm.controls.publishedAt.markAsTouched();
      return;
    }

    this.saveError = null;
    this.isSaving = true;
    this.saveNotice = forcedStatus === 'PUBLISHED' ? 'Publishing post...' : 'Saving draft...';

    const payload = this.buildPayload(forcedStatus);

    this.blogsService
      .addBlogToMongo(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.isSaving = false;
          this.saveNotice =
            forcedStatus === 'PUBLISHED' ? 'Post published.' : 'Draft saved.';

          const blogId =
            response?._id ??
            response?.id ??
            response?.data?._id ??
            response?.data?.id;

          if (blogId) {
            this.router.navigate(['/blogs/post', blogId]);
            return;
          }

          this.router.navigate(['/blogs']);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = 'We could not save this blog right now. Please try again.';
          this.saveNotice = 'Save failed.';
        },
      });
  }

  private buildPayload(forcedStatus?: BlogStatus): Record<string, unknown> {
    const formValue = this.blogForm.getRawValue();
    const normalizedTitle =
      formValue.title?.trim() || this.extractSuggestedTitle(this.editorPlainText) || 'Untitled post';
    const resolvedStatus = forcedStatus ?? formValue.status ?? 'DRAFT';
    let publishedAt = formValue.publishedAt?.trim() || '';

    if (resolvedStatus === 'PUBLISHED' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    return {
      title: normalizedTitle,
      description: formValue.description?.trim() || this.buildExcerpt(this.editorPlainText),
      content: this.editorSerialized || JSON.stringify(this.createEmptyDocument()),
      category: formValue.category?.trim() || '',
      tags: this.parseTags(formValue.tags),
      status: resolvedStatus,
      publishedAt: publishedAt || null,
      readingTimeMinutes: this.calculateReadTime(this.editorPlainText),
    };
  }

  private buildAiPrompt(): string {
    const blogValue = this.blogForm.getRawValue();
    const aiValue = this.aiForm.getRawValue();
    const title = blogValue.title?.trim() || 'Untitled blog post';
    const description = blogValue.description?.trim() || 'Create a polished long-form article.';
    const category = blogValue.category?.trim() || 'General';
    const tags = this.parseTags(blogValue.tags).join(', ') || 'No tags provided';
    const tone = aiValue.tone || 'friendly';

    return [
      'You are a senior editorial strategist helping draft a high-quality blog post.',
      'Return markdown only.',
      'Use one strong H1 title, a short introduction, clear H2 and H3 sections, bullet points when useful, and a closing takeaway.',
      'Do not wrap the response in code fences.',
      `Title: ${title}`,
      `Summary: ${description}`,
      `Category: ${category}`,
      `Tags: ${tags}`,
      `Target audience: ${aiValue.targetAudience?.trim() || 'General readers'}`,
      `Key points to cover: ${aiValue.keyPoints?.trim() || 'Explain the topic clearly and make it practical.'}`,
      `Examples to include: ${aiValue.examples?.trim() || 'Add concrete examples and simple scenarios.'}`,
      `Tone: ${tone}`,
    ].join('\n');
  }

  private applyGeneratedDraft(markdown: string): void {
    const nextDocument = this.convertMarkdownToDocument(markdown);
    this.editorDocument = nextDocument;
    this.editorSerialized = JSON.stringify(nextDocument);
    this.editorPlainText = this.extractText(nextDocument);
    this.remountEditor();

    if (!this.blogForm.controls.title.value?.trim()) {
      const suggestedTitle = this.extractSuggestedTitle(markdown);

      if (suggestedTitle) {
        this.blogForm.patchValue({ title: suggestedTitle });
      }
    }

    if (!this.blogForm.controls.description.value?.trim()) {
      this.blogForm.patchValue({
        description: this.buildExcerpt(this.editorPlainText),
      });
    }

    this.saveNotice = 'AI draft inserted into the editor.';
  }

  private remountEditor(): void {
    this.editorMounted = false;
    setTimeout(() => {
      this.editorMounted = true;
    }, 0);
  }

  private parseTags(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private extractSuggestedTitle(text: string): string {
    const normalized = text.replace(/\r/g, '');
    const headingMatch = normalized.match(/^#\s+(.+)$/m);

    if (headingMatch?.[1]) {
      return headingMatch[1].trim();
    }

    const firstLine = normalized
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    return firstLine?.replace(/^#+\s*/, '') ?? '';
  }

  private buildExcerpt(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    if (!normalized) {
      return 'Fresh draft in progress.';
    }

    return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
  }

  private calculateReadTime(text: string): number {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 220));
  }

  private normalizeDocument(value: unknown): Record<string, unknown> {
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as { type?: unknown }).type === 'doc'
    ) {
      return value as Record<string, unknown>;
    }

    return this.createEmptyDocument();
  }

  private createEmptyDocument(): Record<string, unknown> {
    return {
      type: 'doc',
      version: 1,
      content: [],
    };
  }

  private convertMarkdownToDocument(markdown: string): Record<string, unknown> {
    const blocks = markdown
      .replace(/\r/g, '')
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    const content = blocks.flatMap((block) => this.mapMarkdownBlockToNodes(block));

    return {
      type: 'doc',
      version: 1,
      content: content.length ? content : [this.createParagraphNode('')],
    };
  }

  private mapMarkdownBlockToNodes(block: string): Record<string, unknown>[] {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return [];
    }

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return [{
        type: 'bulletList',
        content: lines.map((line) => ({
          type: 'listItem',
          content: [this.createParagraphNode(line.replace(/^[-*]\s+/, ''))],
        })),
      }];
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return [{
        type: 'orderedList',
        attrs: { order: 1 },
        content: lines.map((line) => ({
          type: 'listItem',
          content: [this.createParagraphNode(line.replace(/^\d+\.\s+/, ''))],
        })),
      }];
    }

    const headingMatch = lines[0].match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const headingLevel = Math.min(headingMatch[1].length, 6);
      const nodes: Record<string, unknown>[] = [
        {
          type: 'heading',
          attrs: { level: headingLevel },
          content: this.createTextNodes(headingMatch[2]),
        },
      ];

      const remainingLines = lines.slice(1).join(' ').trim();

      if (remainingLines) {
        nodes.push(this.createParagraphNode(remainingLines));
      }

      return nodes;
    }

    return [this.createParagraphNode(lines.join(' '))];
  }

  private createParagraphNode(text: string): Record<string, unknown> {
    return {
      type: 'paragraph',
      content: this.createTextNodes(text),
    };
  }

  private createTextNodes(text: string): Record<string, unknown>[] {
    if (!text.trim()) {
      return [];
    }

    return [
      {
        type: 'text',
        text,
      },
    ];
  }

  private extractText(node: unknown): string {
    if (!node || typeof node !== 'object') {
      return '';
    }

    if ((node as { type?: unknown }).type === 'text') {
      return typeof (node as { text?: unknown }).text === 'string'
        ? (node as { text: string }).text
        : '';
    }

    if (Array.isArray((node as { content?: unknown[] }).content)) {
      return (node as { content: unknown[] }).content
        .map((item) => this.extractText(item))
        .filter(Boolean)
        .join(' ');
    }

    return '';
  }
}
