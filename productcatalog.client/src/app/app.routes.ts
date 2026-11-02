import { Routes } from '@angular/router'

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    title: 'Products',
    loadComponent: () =>
      import('./features/products/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/new',
    title: 'New product',
    loadComponent: () =>
      import('./features/products/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'products/:id/edit',
    title: 'Edit product',
    loadComponent: () =>
      import('./features/products/product-form/product-form').then((m) => m.ProductForm),
  },
  { path: '**', redirectTo: 'products' },
]
