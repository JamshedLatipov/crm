import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';

@Component({
  imports: [RouterModule, SoftphoneComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'front';
}
