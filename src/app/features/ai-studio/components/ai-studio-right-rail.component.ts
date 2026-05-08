import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  AiStudioAgent,
  AiStudioCommandId,
  AiStudioContextChip,
  AiStudioEditorInsert,
  AiStudioEditorInsertId,
  AiStudioLiveRun,
  AiStudioSlashCommand,
} from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-right-rail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-right-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioRightRailComponent {
  readonly activeAgent = input.required<AiStudioAgent>();
  readonly commands = input.required<AiStudioSlashCommand[]>();
  readonly contexts = input.required<AiStudioContextChip[]>();
  readonly liveRun = input<AiStudioLiveRun | null>(null);
  readonly editorInserts = input.required<AiStudioEditorInsert[]>();
  readonly lastUsedInsert = input<AiStudioEditorInsert | null>(null);

  readonly commandSelected = output<AiStudioCommandId>();
  readonly contextToggled = output<string>();
  readonly editorInsertSelected = output<AiStudioEditorInsertId>();

  protected activeContextCount(): number {
    return this.contexts().filter((context) => context.active).length;
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

  protected trackByValue(_index: number, value: string): string {
    return value;
  }
}
