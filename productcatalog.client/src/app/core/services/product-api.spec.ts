import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { Product } from '../models/product'
import { ProductApi } from './product-api'

const product: Product = {
  id: 100001,
  name: 'Precision Lens 50mm',
  description: null,
  price: 249.9,
  stockQuantity: 42,
  categoryId: 1,
  categoryName: 'Lenses',
  createdAt: '2026-11-03T10:00:00Z',
  updatedAt: '2026-11-03T10:00:00Z',
}

describe('ProductApi', () => {
  let api: ProductApi
  let httpTesting: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })

    api = TestBed.inject(ProductApi)
    httpTesting = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    try {
      httpTesting.verify()
    } finally {
      TestBed.resetTestingModule()
    }
  })

  it('getAll sends GET /api/products and returns the products', () => {
    let result: Product[] | undefined
    api.getAll().subscribe((products) => (result = products))

    httpTesting.expectOne({ method: 'GET', url: '/api/products' }).flush([product])

    expect(result).toEqual([product])
  })

  it('getById sends GET /api/products/{id}', () => {
    let result: Product | undefined
    api.getById(100001).subscribe((found) => (result = found))

    httpTesting.expectOne({ method: 'GET', url: '/api/products/100001' }).flush(product)

    expect(result).toEqual(product)
  })

  it('create sends POST /api/products with the request as body', () => {
    const request = {
      name: 'New lens',
      description: null,
      price: 10,
      stockQuantity: 5,
      categoryId: 1,
    }
    api.create(request).subscribe()

    const call = httpTesting.expectOne({ method: 'POST', url: '/api/products' })
    expect(call.request.body).toEqual(request)
    call.flush(product)
  })

  it('update sends PUT /api/products/{id} with the request as body', () => {
    const request = { name: 'Renamed lens', description: null, price: 12, categoryId: 1 }
    api.update(100001, request).subscribe()

    const call = httpTesting.expectOne({ method: 'PUT', url: '/api/products/100001' })
    expect(call.request.body).toEqual(request)
    call.flush(product)
  })

  it('delete sends DELETE /api/products/{id}', () => {
    api.delete(100001).subscribe()

    httpTesting.expectOne({ method: 'DELETE', url: '/api/products/100001' }).flush(null)
  })

  it('search sends GET /api/products/search with the name parameter', () => {
    api.search('lens').subscribe()

    httpTesting.expectOne({ method: 'GET', url: '/api/products/search?name=lens' }).flush([])
  })

  it('search encodes special characters in the name', () => {
    api.search('lens & cap').subscribe()

    const call = httpTesting.expectOne((request) => request.url === '/api/products/search')
    expect(call.request.urlWithParams).toBe('/api/products/search?name=lens%20%26%20cap')
    call.flush([])
  })

  it('getByStockLevel sends GET /api/products/stock-level with min and max', () => {
    api.getByStockLevel(0, 5).subscribe()

    httpTesting.expectOne({ method: 'GET', url: '/api/products/stock-level?min=0&max=5' }).flush([])
  })

  it('addStock sends POST /api/products/{id}/add-to-stock/{quantity}', () => {
    api.addStock(100001, 10).subscribe()

    httpTesting
      .expectOne({ method: 'POST', url: '/api/products/100001/add-to-stock/10' })
      .flush(product)
  })

  it('decrementStock sends POST /api/products/{id}/decrement-stock/{quantity}', () => {
    api.decrementStock(100001, 3).subscribe()

    httpTesting
      .expectOne({ method: 'POST', url: '/api/products/100001/decrement-stock/3' })
      .flush(product)
  })
})
