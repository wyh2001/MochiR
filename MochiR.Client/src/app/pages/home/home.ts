import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="container mt-4">
      <h1>Welcome to MochiR</h1>
      <p class="lead">A social review platform.</p>
    </div>
  `,
})
export class Home {}
