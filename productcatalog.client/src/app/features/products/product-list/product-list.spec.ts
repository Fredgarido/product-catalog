import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import type { Mock } from 'vitest'
import { Product } from '../../../core/models/product'
import { ProductApi } from '../../../core/services/product-api'
import { StockDialog } from '../stock-dialog/stock-dialog'
import { ProductList } from './product-list'

function makeProduct(id: number, name: string, stockQuantity: number): Product {
  return {
    id,
    name,
    description: null,
    price: 10,
    stockQuantity,
    categoryId: 1,
    categoryName: 'Lenses',
    createdAt: '2026-11-03T10:00:00Z',
    updatedAt: '2026-11-03T10:00:00Z',
  }
}

const products = [
  makeProduct(100001, 'Precision Lens', 42),
  makeProduct(100002, 'Lens Cap', 3),
  makeProduct(100003, 'Lens Cloth', 0),
]

describe('ProductList', () => {
  let fixture: ComponentFixture<ProductList>
  let productApi: { getAll: Mock; search: Mock; getByStockLevel: Mock }

  beforeEach(() => {
    vi.useFakeTimers()

    productApi = {
      getAll: vi.fn(() => of(products)),
      search: vi.fn(() => of(products)),
      getByStockLevel: vi.fn(() => of(products)),
    }

    TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [provideRouter([]), { provide: ProductApi, useValue: productApi }],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createComponent(): void {
    fixture = TestBed.createComponent(ProductList)
    waitForDebounce()
  }

  function waitForDebounce(): void {
    fixture.detectChanges()
    vi.advanceTimersByTime(300)
    fixture.detectChanges()
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value
    input.dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }

  function searchInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="search"]')
  }

  function stockInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type="number"]'))
  }

  function clickButton(label: string): void {
    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
    buttons.find((button) => button.textContent?.includes(label))!.click()
    fixture.detectChanges()
  }

  function shownNames(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.product-name')).map(
      (name) => name.textContent!.trim(),
    )
  }

  function pageText(): string {
    return fixture.nativeElement.textContent
  }

  it('loads all products when it opens', () => {
    createComponent()

    expect(productApi.getAll).toHaveBeenCalledTimes(1)
    expect(shownNames()).toEqual(['Precision Lens', 'Lens Cap', 'Lens Cloth'])
    expect(pageText()).toContain('3 products · 45 units in stock')
  })

  it('searches by name only once the user stops typing', () => {
    createComponent()

    type(searchInput(), 'l')
    type(searchInput(), 'le')
    type(searchInput(), 'lens')
    waitForDebounce()

    expect(productApi.search).toHaveBeenCalledTimes(1)
    expect(productApi.search).toHaveBeenCalledWith('lens')
  })

  it('uses the stock-level endpoint when only a stock range is set', () => {
    createComponent()

    clickButton('Low stock')
    waitForDebounce()

    expect(productApi.getByStockLevel).toHaveBeenCalledWith(0, 5)
    expect(productApi.search).not.toHaveBeenCalled()
  })

  it('combines a name search with the stock range on the client', () => {
    createComponent()

    type(searchInput(), 'lens')
    clickButton('Low stock')
    waitForDebounce()

    expect(productApi.search).toHaveBeenCalledWith('lens')
    expect(productApi.getByStockLevel).not.toHaveBeenCalled()
    expect(shownNames()).toEqual(['Lens Cap', 'Lens Cloth'])
  })

  it('removes a product whose new stock falls outside the stock filter', () => {
    productApi.getByStockLevel.mockReturnValue(of([products[1], products[2]]))
    createComponent()
    clickButton('Low stock')
    waitForDebounce()

    const stockDialog = fixture.debugElement.query(By.directive(StockDialog))
    stockDialog.componentInstance.stockChanged.emit(makeProduct(100002, 'Lens Cap', 6))
    fixture.detectChanges()

    expect(shownNames()).toEqual(['Lens Cloth'])
  })

  it('shows an error and sends no request when min stock is greater than max', () => {
    createComponent()
    const [min, max] = stockInputs()

    type(min, '10')
    type(max, '5')
    waitForDebounce()

    expect(pageText()).toContain('Minimum stock cannot be greater than maximum stock.')
    expect(productApi.getByStockLevel).not.toHaveBeenCalled()
  })

  it('shows an error when loading fails and loads again on Retry', () => {
    productApi.getAll.mockReturnValueOnce(throwError(() => new Error('API down')))
    createComponent()

    expect(pageText()).toContain('Could not load products')
    expect(shownNames()).toEqual([])

    clickButton('Retry')
    waitForDebounce()

    expect(productApi.getAll).toHaveBeenCalledTimes(2)
    expect(shownNames()).toEqual(['Precision Lens', 'Lens Cap', 'Lens Cloth'])
  })
})
