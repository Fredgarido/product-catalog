import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { CreateProductRequest, Product, UpdateProductRequest } from '../models/product'

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = '/api/products'

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl)
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`)
  }

  create(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, request)
  }

  update(id: number, request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, request)
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
  }

  search(name: string): Observable<Product[]> {
    const params = new HttpParams().set('name', name)
    return this.http.get<Product[]>(`${this.baseUrl}/search`, { params })
  }

  getByStockLevel(min: number, max: number): Observable<Product[]> {
    const params = new HttpParams().set('min', min).set('max', max)
    return this.http.get<Product[]>(`${this.baseUrl}/stock-level`, { params })
  }

  addStock(id: number, quantity: number): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/${id}/add-to-stock/${quantity}`, null)
  }

  decrementStock(id: number, quantity: number): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/${id}/decrement-stock/${quantity}`, null)
  }
}
