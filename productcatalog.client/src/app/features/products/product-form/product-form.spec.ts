import { HttpErrorResponse } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import type { Mock, MockInstance } from 'vitest'
import { Category } from '../../../core/models/category'
import { Product } from '../../../core/models/product'
import { CategoryApi } from '../../../core/services/category-api'
import { ProductApi } from '../../../core/services/product-api'
import { ProductForm } from './product-form'

const categories: Category[] = [
  { id: 1, name: 'Lenses' },
  { id: 2, name: 'Frames' },
]

const product: Product = {
  id: 100001,
  name: 'Precision Lens 50mm',
  description: 'High clarity lens',
  price: 249.9,
  stockQuantity: 42,
  categoryId: 1,
  categoryName: 'Lenses',
  createdAt: '2026-11-03T10:00:00Z',
  updatedAt: '2026-11-03T10:00:00Z',
}

describe('ProductForm', () => {
  let fixture: ComponentFixture<ProductForm>
  let productApi: { getById: Mock; create: Mock; update: Mock }
  let navigate: MockInstance

  function createComponent(id?: string): void {
    productApi = {
      getById: vi.fn(() => of(product)),
      create: vi.fn(() => of(product)),
      update: vi.fn(() => of(product)),
    }

    TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        provideRouter([]),
        { provide: ProductApi, useValue: productApi },
        { provide: CategoryApi, useValue: { getAll: () => of(categories) } },
      ],
    })

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)

    fixture = TestBed.createComponent(ProductForm)
    if (id) {
      fixture.componentRef.setInput('id', id)
    }
    fixture.detectChanges()
  }

  function element<T extends Element>(selector: string): T {
    return fixture.nativeElement.querySelector(selector)
  }

  function type(controlName: string, value: string): void {
    const input = element<HTMLInputElement>(`[formcontrolname="${controlName}"]`)
    input.value = value
    input.dispatchEvent(new Event('input'))
  }

  function selectCategory(name: string): void {
    element<HTMLElement>('.mat-mdc-select-trigger').click()
    fixture.detectChanges()
    const options = Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
    options.find((option) => option.textContent?.trim() === name)!.click()
  }

  function submit(): void {
    element<HTMLButtonElement>('button[type="submit"]').click()
    fixture.detectChanges()
  }

  function errorMessages(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-error')).map(
      (error) => error.textContent!.trim(),
    )
  }

  it('shows required errors and does not save an empty form', () => {
    createComponent()

    submit()

    expect(errorMessages()).toEqual([
      'This field is required.',
      'This field is required.',
      'This field is required.',
    ])
    expect(productApi.create).not.toHaveBeenCalled()
  })

  it('rejects a name made only of spaces', () => {
    createComponent()

    type('name', '   ')
    type('price', '10')
    selectCategory('Lenses')
    submit()

    expect(errorMessages()).toEqual(['This field is required.'])
    expect(productApi.create).not.toHaveBeenCalled()
  })

  it('creates the product with trimmed values and goes back to the list', () => {
    createComponent()

    type('name', '  New lens  ')
    type('price', '19.99')
    type('stockQuantity', '5')
    selectCategory('Frames')
    submit()

    expect(productApi.create).toHaveBeenCalledWith({
      name: 'New lens',
      description: null,
      price: 19.99,
      stockQuantity: 5,
      categoryId: 2,
    })
    expect(navigate).toHaveBeenCalledWith(['/products'])
  })

  it('loads the product in edit mode and saves without the stock', () => {
    createComponent('100001')

    expect(productApi.getById).toHaveBeenCalledWith(100001)
    expect(element<HTMLInputElement>('[formcontrolname="name"]').value).toBe(product.name)
    expect(element<HTMLInputElement>('[formcontrolname="stockQuantity"]').disabled).toBe(true)

    type('price', '199')
    submit()

    expect(productApi.update).toHaveBeenCalledWith(100001, {
      name: product.name,
      description: product.description,
      price: 199,
      categoryId: product.categoryId,
    })
  })

  it('shows a validation error from the server under the right field', () => {
    createComponent()
    productApi.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: { Name: ['A product with this name already exists.'] } },
          }),
      ),
    )

    type('name', 'Precision Lens 50mm')
    type('price', '10')
    selectCategory('Lenses')
    submit()

    expect(errorMessages()).toEqual(['A product with this name already exists.'])
    expect(navigate).not.toHaveBeenCalled()
  })
})
