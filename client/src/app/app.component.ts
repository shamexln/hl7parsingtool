import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink, RouterOutlet} from '@angular/router';
import {HeaderComponent} from '@odx/angular/components/header';
import {ButtonComponent} from '@odx/angular/components/button';
import {IconComponent} from '@odx/angular/components/icon';
import {MainMenuModule} from '@odx/angular/components/main-menu';
import {RailNavigationModule} from '@odx/angular/components/rail-navigation';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, ButtonComponent, IconComponent, MainMenuModule, RailNavigationModule, RouterLink],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],

})
export class AppComponent {
  title: string = 'HL7 Parsing Tool';
  subtitle: string = '1.0.1';
  copyright = '© Drägerwerk AG & Co. KGaA 2025';
}
