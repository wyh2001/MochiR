import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

interface ApiResponseEnvelope {
  success: boolean;
  data: unknown;
  error: { code: string; message: string; details: unknown } | null;
  traceId: string;
  timestampUtc: string;
}

function isApiResponseEnvelope(body: unknown): body is ApiResponseEnvelope {
  return body !== null && typeof body === 'object' && 'success' in body && 'data' in body;
}

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse && isApiResponseEnvelope(event.body)) {
        const envelope = event.body;
        if (envelope.success) {
          return event.clone({ body: envelope.data });
        }
        throw envelope.error;
      }
      return event;
    }),
  );
};
