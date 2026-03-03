import { Component, inject, input } from '@angular/core';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-settings-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings-editor.html',
})
export class SettingsEditor {
  private readonly fb = inject(FormBuilder);

  readonly settings = input.required<FormArray<FormGroup>>();

  addSetting(): void {
    this.settings().push(
      this.fb.group({
        key: ['', Validators.required],
        value: [''],
        note: [''],
      }),
    );
  }

  removeSetting(index: number): void {
    this.settings().removeAt(index);
  }

  ctrl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}
