import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SetupService } from '../services/setup.service';
import { setupGuard } from './setup.guard';

@Component({ template: '' })
class DummyComponent {}

describe('setupGuard', () => {
  let router: Router;

  function configure(statusResult: 'needs-setup' | 'no-setup' | 'error'): void {
    const getStatus = () => {
      if (statusResult === 'error') return throwError(() => new Error('Network error'));
      return of({ needsSetup: statusResult === 'needs-setup' });
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SetupService,
          useValue: { getStatus },
        },
        provideRouter([
          {
            path: '',
            canActivateChild: [setupGuard],
            children: [
              { path: '', component: DummyComponent },
              { path: 'setup', component: DummyComponent },
              { path: 'protected', component: DummyComponent },
            ],
          },
        ]),
      ],
    });

    router = TestBed.inject(Router);
  }

  it('redirects any route to /setup when needsSetup=true', async () => {
    configure('needs-setup');
    const result = await router.navigateByUrl('/protected');
    expect(result).toBe(true);
    expect(router.url).toBe('/setup');
  });

  it('allows /setup when needsSetup=true', async () => {
    configure('needs-setup');
    const result = await router.navigateByUrl('/setup');
    expect(result).toBe(true);
    expect(router.url).toBe('/setup');
  });

  it('redirects /setup to / when needsSetup=false', async () => {
    configure('no-setup');
    const result = await router.navigateByUrl('/setup');
    expect(result).toBe(true);
    expect(router.url).toBe('/');
  });

  it('allows non-setup routes when needsSetup=false', async () => {
    configure('no-setup');
    const result = await router.navigateByUrl('/protected');
    expect(result).toBe(true);
    expect(router.url).toBe('/protected');
  });

  it('allows navigation when getStatus() errors', async () => {
    configure('error');
    const result = await router.navigateByUrl('/protected');
    expect(result).toBe(true);
    expect(router.url).toBe('/protected');
  });
});
