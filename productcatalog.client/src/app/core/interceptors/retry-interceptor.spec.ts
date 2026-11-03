import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { retryInterceptor } from './retry-interceptor'

const url = '/api/products'

describe('retryInterceptor', () => {
  let http: HttpClient
  let httpTesting: HttpTestingController

  beforeEach(() => {
    vi.useFakeTimers()

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    })

    http = TestBed.inject(HttpClient)
    httpTesting = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    vi.useRealTimers()

    try {
      httpTesting.verify()
    } finally {
      TestBed.resetTestingModule()
    }
  })

  function respondWithStatus(status: number): void {
    httpTesting.expectOne(url).flush(null, { status, statusText: 'Error' })
  }

  it('returns the response when the first attempt succeeds', () => {
    let result: unknown
    http.get(url).subscribe((body) => (result = body))

    httpTesting.expectOne(url).flush(['product'])

    expect(result).toEqual(['product'])
  })

  it('retries a GET after a 503 and returns the later success', () => {
    let result: unknown
    http.get(url).subscribe((body) => (result = body))

    respondWithStatus(503)
    vi.advanceTimersByTime(1000)
    httpTesting.expectOne(url).flush(['product'])

    expect(result).toEqual(['product'])
  })

  it('retries a GET when the server cannot be reached', () => {
    let result: unknown
    http.get(url).subscribe((body) => (result = body))

    httpTesting.expectOne(url).error(new ProgressEvent('error'))
    vi.advanceTimersByTime(1000)
    httpTesting.expectOne(url).flush(['product'])

    expect(result).toEqual(['product'])
  })

  it('waits longer before each new attempt', () => {
    http.get(url).subscribe()

    respondWithStatus(503)
    vi.advanceTimersByTime(999)
    httpTesting.expectNone(url)
    vi.advanceTimersByTime(1)

    respondWithStatus(503)
    vi.advanceTimersByTime(1999)
    httpTesting.expectNone(url)
    vi.advanceTimersByTime(1)

    httpTesting.expectOne(url).flush([])
  })

  it('does not retry errors like 404', () => {
    let error: HttpErrorResponse | undefined
    http.get(url).subscribe({ error: (e: HttpErrorResponse) => (error = e) })

    respondWithStatus(404)
    vi.advanceTimersByTime(10_000)

    httpTesting.expectNone(url)
    expect(error?.status).toBe(404)
  })

  it('does not retry a POST, even after a 503', () => {
    let error: HttpErrorResponse | undefined
    http.post(url, {}).subscribe({ error: (e: HttpErrorResponse) => (error = e) })

    respondWithStatus(503)
    vi.advanceTimersByTime(10_000)

    httpTesting.expectNone(url)
    expect(error?.status).toBe(503)
  })

  it('gives up after 5 retries and reports the error', () => {
    let error: HttpErrorResponse | undefined
    http.get(url).subscribe({ error: (e: HttpErrorResponse) => (error = e) })

    respondWithStatus(503)
    for (let retry = 1; retry <= 5; retry++) {
      vi.advanceTimersByTime(1000 * retry)
      respondWithStatus(503)
    }

    expect(error?.status).toBe(503)
  })
})
