import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoUi } from './sto-ui';

describe('StoUi', () => {
  let component: StoUi;
  let fixture: ComponentFixture<StoUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoUi],
    }).compileComponents();

    fixture = TestBed.createComponent(StoUi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
