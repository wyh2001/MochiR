import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<Notification[]>([]);

  show(type: Notification['type'], message: string, autoDismissMs = 5000): void {
    const id = crypto.randomUUID();
    this.notifications.update((list) => [...list, { id, type, message }]);

    if (autoDismissMs > 0) {
      setTimeout(() => this.remove(id), autoDismissMs);
    }
  }

  remove(id: string): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notifications.set([]);
  }
}
