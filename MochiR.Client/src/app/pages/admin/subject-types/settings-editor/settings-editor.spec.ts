import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SettingsEditor } from './settings-editor';

describe('SettingsEditor', () => {
  let fixture: ComponentFixture<SettingsEditor>;
  let settings: FormArray<FormGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsEditor, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsEditor);

    const fb = TestBed.inject(FormBuilder);
    settings = fb.array<FormGroup>([]);
    fixture.componentRef.setInput('settings', settings);
    fixture.detectChanges();
  });

  function clickAddSetting(): void {
    const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-add-setting');
    addBtn.click();
    fixture.detectChanges();
  }

  it('renders with no rows initially', () => {
    const rows = fixture.nativeElement.querySelectorAll('.setting-row');
    expect(rows.length).toBe(0);
  });

  it('adds a setting row when Add Setting is clicked', () => {
    clickAddSetting();

    expect(settings.length).toBe(1);
    const rows = fixture.nativeElement.querySelectorAll('.setting-row');
    expect(rows.length).toBe(1);
  });

  it('removes a setting row when Remove is clicked', () => {
    clickAddSetting();
    clickAddSetting();
    expect(settings.length).toBe(2);

    const removeButtons = fixture.nativeElement.querySelectorAll('.btn-remove-setting');
    removeButtons[0].click();
    fixture.detectChanges();

    expect(settings.length).toBe(1);
  });

  it('requires setting key to be non-empty', () => {
    clickAddSetting();

    const keyControl = settings.at(0).get('key')!;
    keyControl.setValue('');
    keyControl.markAsTouched();
    fixture.detectChanges();

    expect(keyControl.invalid).toBe(true);

    const errorEl = fixture.nativeElement.querySelector('.invalid-feedback');
    expect(errorEl).toBeTruthy();
  });

  it('allows empty value and note fields', () => {
    clickAddSetting();

    const group = settings.at(0);
    group.get('key')!.setValue('test-key');
    group.get('value')!.setValue('');
    group.get('note')!.setValue('');

    expect(group.valid).toBe(true);
  });
});
