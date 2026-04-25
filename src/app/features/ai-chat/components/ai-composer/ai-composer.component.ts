import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { AiAttachment } from '../../models/ai-chat.models';

@Component({
  selector: 'app-ai-composer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class AiComposerComponent implements AfterViewInit, OnChanges {
  readonly text = input('');
  readonly attachments = input<AiAttachment[]>([]);
  readonly webSearchEnabled = input(true);
  readonly deepThinkEnabled = input(true);
  readonly isGenerating = input(false);

  readonly textChange = output<string>();
  readonly filesSelected = output<File[]>();
  readonly removeAttachment = output<string>();
  readonly toggleOption = output<'webSearch' | 'deepThink'>();
  readonly sendMessage = output<void>();
  readonly stopGeneration = output<void>();

  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
    this.resizeComposer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      queueMicrotask(() => this.resizeComposer());
    }
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.textChange.emit(target.value);
    this.resizeComposer(target);
  }

  protected handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    this.sendMessage.emit();
  }

  protected openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  protected handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.filesSelected.emit(files);
    input.value = '';
  }

  protected removeAttachmentById(id: string): void {
    this.removeAttachment.emit(id);
  }

  protected toggleComposerOption(option: 'webSearch' | 'deepThink'): void {
    this.toggleOption.emit(option);
  }

  protected send(): void {
    this.sendMessage.emit();
  }

  protected stop(): void {
    this.stopGeneration.emit();
  }

  protected trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  private resizeComposer(textarea?: HTMLTextAreaElement): void {
    const composer = textarea ?? this.composerInput?.nativeElement;
    if (!composer) {
      return;
    }

    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 260)}px`;
  }
}
