import { ApiError } from '../../api/models/api-error';

export function isApiError(err: unknown): err is ApiError {
  return err !== null && typeof err === 'object' && 'code' in err && 'message' in err;
}
