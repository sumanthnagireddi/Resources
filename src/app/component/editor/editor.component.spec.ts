import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtlasEditorComponent } from './editor.component';

describe('AtlasEditorComponent', () => {
  let component: AtlasEditorComponent;
  let fixture: ComponentFixture<AtlasEditorComponent>;

  beforeEach(async () => {
    if (!customElements.get('atlas-editor-angular')) {
      customElements.define('atlas-editor-angular', class extends HTMLElement {});
    }

    await TestBed.configureTestingModule({
      imports: [AtlasEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AtlasEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
