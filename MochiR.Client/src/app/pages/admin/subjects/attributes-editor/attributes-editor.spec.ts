import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AttributesEditor } from './attributes-editor';

describe('AttributesEditor', () => {
  let fixture: ComponentFixture<AttributesEditor>;
  let attributes: FormArray<FormGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttributesEditor, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AttributesEditor);

    const fb = TestBed.inject(FormBuilder);
    attributes = fb.array<FormGroup>([]);
    fixture.componentRef.setInput('attributes', attributes);
    fixture.detectChanges();
  });

  function clickAddAttribute(): void {
    const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-attribute');
    addBtn.click();
    fixture.detectChanges();
  }

  it('renders with no rows initially', () => {
    const rows = fixture.nativeElement.querySelectorAll('.attribute-row');
    expect(rows.length).toBe(0);
  });

  it('adds a row when Add Attribute is clicked', () => {
    clickAddAttribute();

    expect(attributes.length).toBe(1);
    const rows = fixture.nativeElement.querySelectorAll('.attribute-row');
    expect(rows.length).toBe(1);
  });

  it('renders key, value, note inputs for each row', () => {
    clickAddAttribute();

    const inputs = fixture.nativeElement.querySelectorAll('.attribute-row input');
    expect(inputs.length).toBe(3);
  });

  it('removes a row when remove button is clicked', () => {
    clickAddAttribute();
    clickAddAttribute();
    expect(attributes.length).toBe(2);

    const removeBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('.btn-remove-attribute');
    removeBtn.click();
    fixture.detectChanges();

    expect(attributes.length).toBe(1);
  });

  it('requires key field', () => {
    clickAddAttribute();

    const keyControl = attributes.at(0).get('key')!;
    expect(keyControl.valid).toBe(false);

    keyControl.setValue('director');
    expect(keyControl.valid).toBe(true);
  });

  it('allows empty value and note fields', () => {
    clickAddAttribute();

    const group = attributes.at(0);
    group.get('key')!.setValue('test-key');
    group.get('value')!.setValue('');
    group.get('note')!.setValue('');

    expect(group.valid).toBe(true);
  });
});
