import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { AiMarkdownService } from '../../ai-chat/services/ai-markdown.service';
import { AiStudioLiveRun, AiStudioRunStep } from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-run-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-run-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioRunStatusComponent {
  private readonly markdownService = inject(AiMarkdownService);

  readonly run = input.required<AiStudioLiveRun>();

  protected renderContent(content: string): string {
    return this.markdownService.render(content);
  }

  protected stepClasses(step: AiStudioRunStep): string {
    switch (step.status) {
      case 'complete':
        return 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10';
      case 'active':
        return 'border-[#caa88b] bg-white shadow-[0_10px_26px_rgba(56,40,24,0.08)] dark:border-[#6b5040] dark:bg-black/20 dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)]';
      case 'cancelled':
        return 'border-rose-200/80 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/10';
      default:
        return 'border-[#e5d7c6] bg-white/70 dark:border-[#302720] dark:bg-white/[0.04]';
    }
  }

  protected statusTextClasses(step: AiStudioRunStep): string {
    switch (step.status) {
      case 'complete':
        return 'text-emerald-600 dark:text-emerald-300';
      case 'active':
        return 'text-[#8f5738] dark:text-[#e2b08f]';
      case 'cancelled':
        return 'text-rose-600 dark:text-rose-300';
      default:
        return 'text-[#7b6a59] dark:text-[#c4b19f]';
    }
  }

  protected trackByStepId(_index: number, step: AiStudioRunStep): string {
    return step.id;
  }

  protected trackByValue(_index: number, value: string): string {
    return value;
  }
}
