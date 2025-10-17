import {Component} from '@angular/core';
import {CommonModule, AsyncPipe} from '@angular/common';
import {Router, RouterLink, RouterOutlet} from '@angular/router';
import {HeaderComponent} from '@odx/angular/components/header';
import {ButtonComponent} from '@odx/angular/components/button';
import {IconComponent} from '@odx/angular/components/icon';
import {MainMenuModule} from '@odx/angular/components/main-menu';
import {RailNavigationModule} from '@odx/angular/components/rail-navigation';
import { AuthService } from './auth.service';
import { TranslateModule } from '@ngx-translate/core';
import {AvatarComponent} from '@odx/angular/components/avatar';
import {MenuModule} from '@odx/angular/components/menu';
import { HttpClient } from '@angular/common/http';


// @ts-ignore
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterOutlet, HeaderComponent, ButtonComponent, IconComponent, MainMenuModule, RailNavigationModule, RouterLink, TranslateModule, AvatarComponent, MenuModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],

})
export class AppComponent {
  title: string = 'HL7 Parsing Tool';
  subtitle: string = '1.0.1';
  buildDateText: string | null = '2020';

  get isLoggedIn$() { return this.auth.isLoggedIn$; }

  constructor(private auth: AuthService, private router: Router, private http: HttpClient) {
    // Load build date from backend (reads 'version' file on server)
    this.http.get<{ buildDate: string | null }>('/api/version').subscribe({
      next: (res) => {
        const bd = res && typeof res.buildDate === 'string' ? res.buildDate.trim() : '';
        this.buildDateText = bd ? `Build: ${bd}` : null;
      },
      error: () => {
        this.buildDateText = null;
      }
    });
  }

  changePassword() {
    // Minimal implementation: navigate to configuration page where credentials can be managed,
    // or adjust later if a dedicated route/modal is introduced.
    this.router.navigate(['/config']);
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
