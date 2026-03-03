import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mt-4">
      <div class="alert alert-danger">
        <h4 class="alert-heading">Access Denied</h4>
        <p>You do not have permission to view this page.</p>
        <a routerLink="/" class="alert-link">Go back to the home page</a>
      </div>
    </div>
  `,
})
export class AccessDenied {}
