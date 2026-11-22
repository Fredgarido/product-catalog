import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { retry, timer } from 'rxjs'

// 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
// Rejects 400, 404, 409, 500
const retryableStatuses = [0, 502, 503, 504]
const maxRetries = 7
const baseDelayMs = 1000

export const retryInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method !== 'GET') {
    return next(request)
  }

  return next(request).pipe(
    retry({
      count: maxRetries,
      delay: (error: unknown, retryCount: number) => {
        if (error instanceof HttpErrorResponse && retryableStatuses.includes(error.status)) {
          // Wait longer before each retry: 1s, 2s, 3s… up to 7s
          return timer(baseDelayMs * retryCount)
        }

        throw error
      },
    }),
  )
}
