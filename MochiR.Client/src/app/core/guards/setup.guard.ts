import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SetupService } from '../services/setup.service';

export const setupGuard: CanActivateChildFn = (_childRoute, state) => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  return setupService.getStatus().pipe(
    map((status) => {
      const url = state.url;
      const isSetupPage =
        url === '/setup' || url.startsWith('/setup/') || url.startsWith('/setup?');

      if (status.needsSetup && !isSetupPage) {
        return router.createUrlTree(['/setup']);
      }

      if (!status.needsSetup && isSetupPage) {
        return router.createUrlTree(['/']);
      }

      return true;
    }),
    catchError(() => of(true)),
  );
};
