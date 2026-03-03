import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty notification list', () => {
    expect(service.notifications()).toEqual([]);
  });

  it('adds a notification via show()', () => {
    service.show('danger', 'Something failed');
    const items = service.notifications();
    expect(items.length).toBe(1);
    expect(items[0].type).toBe('danger');
    expect(items[0].message).toBe('Something failed');
    expect(items[0].id).toBeTruthy();
  });

  it('removes a notification by id', () => {
    service.show('info', 'Hello');
    const id = service.notifications()[0].id;
    service.remove(id);
    expect(service.notifications()).toEqual([]);
  });

  it('clears all notifications', () => {
    service.show('info', 'One');
    service.show('warning', 'Two');
    service.clear();
    expect(service.notifications()).toEqual([]);
  });

  it('auto-dismisses after timeout', () => {
    service.show('success', 'Done', 3000);
    expect(service.notifications().length).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(service.notifications().length).toBe(0);
  });
});
