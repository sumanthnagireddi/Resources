import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiButtonComponent } from './ai-button.component';

describe('AiButtonComponent', () => {
  let component: AiButtonComponent;
  let fixture: ComponentFixture<AiButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
