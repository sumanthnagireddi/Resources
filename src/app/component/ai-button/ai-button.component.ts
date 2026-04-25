import { Component, output } from '@angular/core';

@Component({
  selector: 'app-ai-button',
  imports: [],
  templateUrl: './ai-button.component.html',
  styleUrl: './ai-button.component.css',
})
export class AiButtonComponent {
  onclick = output<boolean>();

  handleClick() {
    this.onclick.emit(true);
  }
}
