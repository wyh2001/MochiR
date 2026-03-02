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
  selector: 'app-attributes-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './attributes-editor.html',
})
export class AttributesEditor {
  private readonly fb = inject(FormBuilder);

  readonly attributes = input.required<FormArray<FormGroup>>();

  addAttribute(): void {
    this.attributes().push(
      this.fb.group({
        key: ['', Validators.required],
        value: [''],
        note: [''],
      }),
    );
  }

  removeAttribute(index: number): void {
    this.attributes().removeAt(index);
  }

  ctrl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}
