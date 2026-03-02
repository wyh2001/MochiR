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
  selector: 'app-ratings-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './ratings-editor.html',
})
export class RatingsEditor {
  private readonly fb = inject(FormBuilder);

  readonly ratings = input.required<FormArray<FormGroup>>();

  addRating(): void {
    this.ratings().push(
      this.fb.group({
        key: ['', Validators.required],
        label: [''],
        score: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeRating(index: number): void {
    this.ratings().removeAt(index);
  }

  ctrl(group: FormGroup, name: string): FormControl {
    return group.get(name) as FormControl;
  }
}
