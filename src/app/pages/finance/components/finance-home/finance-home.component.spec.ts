import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceHomeComponent } from './finance-home.component';

describe('FinanceHomeComponent', () => {
  let component: FinanceHomeComponent;
  let fixture: ComponentFixture<FinanceHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
