import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  imports: [RouterModule, SoftphoneComponent, SidebarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'front';
}
