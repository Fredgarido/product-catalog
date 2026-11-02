export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stockQuantity: number
  categoryId: number
  categoryName: string
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  name: string
  description: string | null
  price: number
  stockQuantity: number
  categoryId: number
}

export type UpdateProductRequest = Omit<CreateProductRequest, 'stockQuantity'>
