import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar';
import { Footer } from './layout/footer';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { class: 'd-flex flex-column min-vh-100' },
})
export class App {
  protected readonly notifications = inject(NotificationService);
}
