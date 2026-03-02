import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RatingsEditor } from './ratings-editor';

describe('RatingsEditor', () => {
  let fixture: ComponentFixture<RatingsEditor>;
  let ratings: FormArray<FormGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingsEditor, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingsEditor);

    const fb = TestBed.inject(FormBuilder);
    ratings = fb.array<FormGroup>([]);
    fixture.componentRef.setInput('ratings', ratings);
    fixture.detectChanges();
  });

  function clickAddRating(): void {
    const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-rating');
    addBtn.click();
    fixture.detectChanges();
  }

  it('renders with no rows initially', () => {
    const rows = fixture.nativeElement.querySelectorAll('.rating-row');
    expect(rows.length).toBe(0);
  });

  it('adds a row when Add Rating is clicked', () => {
    clickAddRating();

    expect(ratings.length).toBe(1);
    const rows = fixture.nativeElement.querySelectorAll('.rating-row');
    expect(rows.length).toBe(1);
  });

  it('renders key, label, score inputs for each row', () => {
    clickAddRating();

    const inputs = fixture.nativeElement.querySelectorAll('.rating-row input');
    expect(inputs.length).toBe(3);
  });

  it('removes a row when remove button is clicked', () => {
    clickAddRating();
    clickAddRating();
    expect(ratings.length).toBe(2);

    const removeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-remove-rating');
    removeBtn.click();
    fixture.detectChanges();

    expect(ratings.length).toBe(1);
  });

  it('requires key field', () => {
    clickAddRating();

    const keyControl = ratings.at(0).get('key')!;
    expect(keyControl.valid).toBe(false);

    keyControl.setValue('story');
    expect(keyControl.valid).toBe(true);
  });

  it('requires score field', () => {
    clickAddRating();

    const scoreControl = ratings.at(0).get('score')!;
    scoreControl.setValue(null);
    expect(scoreControl.valid).toBe(false);

    scoreControl.setValue(8);
    expect(scoreControl.valid).toBe(true);
  });

  it('allows empty label field', () => {
    clickAddRating();

    const group = ratings.at(0);
    group.get('key')!.setValue('story');
    group.get('label')!.setValue('');
    group.get('score')!.setValue(8);

    expect(group.valid).toBe(true);
  });
});
