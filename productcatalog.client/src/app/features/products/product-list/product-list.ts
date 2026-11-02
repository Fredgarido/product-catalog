import { Component, inject } from '@angular/core'
import { ProductApi } from '../../../core/services/product-api'

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly productApi = inject(ProductApi)

  constructor() {
    this.productApi.getAll().subscribe((products) => {
      console.log('Products from the API:', products)
    })
  }
}
