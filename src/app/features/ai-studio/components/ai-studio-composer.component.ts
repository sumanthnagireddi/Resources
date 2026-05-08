import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import {
  AiStudioAgent,
  AiStudioCommandId,
  AiStudioContextChip,
  AiStudioEditorInsert,
  AiStudioEditorInsertId,
  AiStudioSlashCommand,
} from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-composer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioComposerComponent implements AfterViewInit {
  readonly draft = input('');
  readonly isGenerating = input(false);
  readonly activeAgent = input.required<AiStudioAgent>();
  readonly contexts = input.required<AiStudioContextChip[]>();
  readonly draftCommand = input<AiStudioSlashCommand | undefined>();
  readonly showSlashMenu = input(false);
  readonly commands = input.required<AiStudioSlashCommand[]>();
  readonly editorInserts = input.required<AiStudioEditorInsert[]>();
  readonly lastUsedInsert = input<AiStudioEditorInsert | null>(null);

  readonly draftChange = output<string>();
  readonly sendMessage = output<void>();
  readonly stopMessage = output<void>();
  readonly contextToggled = output<string>();
  readonly commandSelected = output<AiStudioCommandId>();
  readonly editorInsertSelected = output<AiStudioEditorInsertId>();

  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;

  constructor() {
    effect(() => {
      this.draft();
      queueMicrotask(() => this.resizeComposer());
    });
  }

  ngAfterViewInit(): void {
    this.resizeComposer();
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.draftChange.emit(target.value);
    this.resizeComposer(target);
  }

  protected handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();

    if (this.isGenerating()) {
      this.stopMessage.emit();
      return;
    }

    this.sendMessage.emit();
  }

  protected trackByCommandId(_index: number, command: AiStudioSlashCommand): string {
    return command.id;
  }

  protected trackByContextId(_index: number, context: AiStudioContextChip): string {
    return context.id;
  }

  protected trackByInsertId(_index: number, insert: AiStudioEditorInsert): string {
    return insert.id;
  }

  protected activeContexts(): AiStudioContextChip[] {
    return this.contexts().filter((context) => context.active).slice(0, 3);
  }

  protected selectCommand(commandId: AiStudioCommandId): void {
    this.commandSelected.emit(commandId);
    queueMicrotask(() => this.focusComposer());
  }

  protected selectInsert(insertId: AiStudioEditorInsertId): void {
    this.editorInsertSelected.emit(insertId);
    queueMicrotask(() => this.focusComposer());
  }

  private resizeComposer(textarea?: HTMLTextAreaElement): void {
    const composer = textarea ?? this.composerInput?.nativeElement;
    if (!composer) {
      return;
    }

    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 220)}px`;
  }

  private focusComposer(): void {
    this.composerInput?.nativeElement.focus();
  }
}
