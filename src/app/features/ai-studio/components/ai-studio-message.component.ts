import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AiMarkdownService } from '../../ai-chat/services/ai-markdown.service';
import { AiStudioArtifact, AiStudioMessage } from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioMessageComponent {
  private readonly markdownService = inject(AiMarkdownService);

  readonly message = input.required<AiStudioMessage>();
  readonly followUpSelected = output<string>();

  protected renderContent(content: string): string {
    return this.markdownService.render(content);
  }

  protected formatTime(value: string): string {
    const date = new Date(value);

    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected assistantCardClasses(): string {
    if (this.message().error) {
      return 'border-rose-200/80 bg-rose-50/88 dark:border-rose-500/20 dark:bg-rose-500/10';
    }

    if (this.message().stopped) {
      return 'border-amber-200/80 bg-amber-50/88 dark:border-amber-500/20 dark:bg-amber-500/10';
    }

    return 'border-white/80 bg-white/94 dark:border-white/10 dark:bg-white/[0.05]';
  }

  protected artifactIcon(artifact: AiStudioArtifact): string {
    switch (artifact.kind) {
      case 'plan':
        return 'route';
      case 'code':
        return 'deployed_code';
      case 'checklist':
        return 'checklist';
      default:
        return 'description';
    }
  }

  protected artifactLabel(artifact: AiStudioArtifact): string {
    switch (artifact.kind) {
      case 'plan':
        return 'Plan';
      case 'code':
        return 'Build';
      case 'checklist':
        return 'Checklist';
      default:
        return 'Brief';
    }
  }

  protected artifactCardClasses(artifact: AiStudioArtifact): string {
    switch (artifact.kind) {
      case 'plan':
        return 'border-[#d9e7ff] bg-[#f4f8ff] dark:border-[#294066] dark:bg-[#182131]';
      case 'code':
        return 'border-[#d7ece7] bg-[#f2fbf7] dark:border-[#21453a] dark:bg-[#15231f]';
      case 'checklist':
        return 'border-[#f3e2bf] bg-[#fff8ea] dark:border-[#5a4630] dark:bg-[#2a2115]';
      default:
        return 'border-[#eadfd2] bg-[#fbf7f1] dark:border-[#3a3029] dark:bg-[#1d1714]';
    }
  }

  protected artifactPillClasses(artifact: AiStudioArtifact): string {
    switch (artifact.kind) {
      case 'plan':
        return 'bg-[#dde9ff] text-[#4466a3] dark:bg-[#223a60] dark:text-[#bfd4ff]';
      case 'code':
        return 'bg-[#dbefe7] text-[#326c57] dark:bg-[#1f4034] dark:text-[#b8e6d4]';
      case 'checklist':
        return 'bg-[#f7e9c9] text-[#8e6634] dark:bg-[#4c3820] dark:text-[#f1d49a]';
      default:
        return 'bg-[#f1e4d7] text-[#8f5738] dark:bg-[#2a211b] dark:text-[#e2b08f]';
    }
  }

  protected trackByValue(_index: number, value: string): string {
    return value;
  }

  protected trackByArtifact(_index: number, artifact: AiStudioArtifact): string {
    return `${artifact.kind}-${artifact.title}`;
  }
}
