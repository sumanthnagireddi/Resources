import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AiStudioShellComponent } from '../../features/ai-studio/ai-studio-shell.component';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [AiStudioShellComponent],
  templateUrl: './ai.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-h-0',
  },
})
export class AiComponent {}
