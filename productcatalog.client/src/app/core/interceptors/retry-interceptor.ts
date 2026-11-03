import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { retry, timer } from 'rxjs'

const retryableStatuses = [0, 502, 503, 504]
const maxRetries = 5
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
          return timer(baseDelayMs * retryCount)
        }

        throw error
      },
    }),
  )
}
