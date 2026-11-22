import { Observable } from 'rxjs'
import { CreateProductRequest, Product, UpdateProductRequest } from '../models/product'

/**
 * Contract for talking to the products API. Components inject this abstract class;
 * app.config.ts decides which implementation they get (HttpProductApi).
 */
export abstract class ProductApi {
  abstract getAll(): Observable<Product[]>
  abstract getById(id: number): Observable<Product>
  abstract create(request: CreateProductRequest): Observable<Product>
  abstract update(id: number, request: UpdateProductRequest): Observable<Product>
  abstract delete(id: number): Observable<void>
  abstract search(name: string): Observable<Product[]>
  abstract getByStockLevel(min: number, max: number): Observable<Product[]>
  abstract addStock(id: number, quantity: number): Observable<Product>
  abstract decrementStock(id: number, quantity: number): Observable<Product>
}
