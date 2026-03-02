import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="bg-light text-center text-muted py-3 mt-auto">
      <div class="container">&copy; {{ year }} MochiR</div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
