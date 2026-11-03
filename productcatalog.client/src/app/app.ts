import { Component } from '@angular/core'
import { MatToolbar } from '@angular/material/toolbar'
import { RouterLink, RouterOutlet } from '@angular/router'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatToolbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
