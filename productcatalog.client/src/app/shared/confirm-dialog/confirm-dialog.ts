import { Component, ElementRef, afterRenderEffect, input, output, viewChild } from '@angular/core'

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly open = input(false)
  readonly title = input.required<string>()
  readonly message = input('')
  readonly confirmLabel = input('Confirm')
  readonly variant = input<'primary' | 'danger'>('primary')
  readonly busy = input(false)

  readonly confirmed = output<void>()
  readonly cancelled = output<void>()

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog')

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement

      if (this.open() && !dialog.open) {
        dialog.showModal()
      } else if (!this.open() && dialog.open) {
        dialog.close()
      }
    })
  }

  protected onCancel(event: Event): void {
    event.preventDefault()

    if (!this.busy()) {
      this.cancelled.emit()
    }
  }
}
