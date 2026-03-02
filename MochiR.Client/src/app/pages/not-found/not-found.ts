import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mt-4">
      <div class="alert alert-warning">
        <h4 class="alert-heading">Page Not Found</h4>
        <p>The page you are looking for does not exist.</p>
        <a routerLink="/" class="alert-link">Go back to the home page</a>
      </div>
    </div>
  `,
})
export class NotFound {}
