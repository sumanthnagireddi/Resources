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

@Component({
  selector: 'app-ai-chat-composer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-chat-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatComposerComponent implements AfterViewInit, OnChanges {
  readonly text = input('');
  readonly isGenerating = input(false);

  readonly textChange = output<string>();
  readonly sendMessage = output<void>();

  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;

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
    this.send();
  }

  protected send(): void {
    this.sendMessage.emit();
  }

  private resizeComposer(textarea?: HTMLTextAreaElement): void {
    const composer = textarea ?? this.composerInput?.nativeElement;
    if (!composer) {
      return;
    }

    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 200)}px`;
  }
}
