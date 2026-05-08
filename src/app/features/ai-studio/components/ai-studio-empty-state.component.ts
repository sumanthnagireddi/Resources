import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  AiStudioAgent,
  AiStudioAgentId,
  AiStudioEditorInsert,
  AiStudioEditorInsertId,
  AiStudioStarterPrompt,
} from '../models/ai-studio.models';

@Component({
  selector: 'app-ai-studio-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-studio-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiStudioEmptyStateComponent {
  readonly prompts = input.required<AiStudioStarterPrompt[]>();
  readonly agents = input.required<AiStudioAgent[]>();
  readonly activeAgentId = input.required<AiStudioAgentId>();
  readonly editorInserts = input.required<AiStudioEditorInsert[]>();

  readonly promptSelected = output<string>();
  readonly agentSelected = output<AiStudioAgentId>();
  readonly editorInsertSelected = output<AiStudioEditorInsertId>();

  protected trackByPromptTitle(_index: number, prompt: AiStudioStarterPrompt): string {
    return prompt.title;
  }

  protected trackByAgentId(_index: number, agent: AiStudioAgent): string {
    return agent.id;
  }

  protected trackByInsertId(_index: number, insert: AiStudioEditorInsert): string {
    return insert.id;
  }
}
