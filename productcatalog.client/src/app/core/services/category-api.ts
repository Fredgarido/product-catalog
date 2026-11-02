import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { Category } from '../models/category'

@Injectable({ providedIn: 'root' })
export class CategoryApi {
  private readonly http = inject(HttpClient)

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories')
  }
}
