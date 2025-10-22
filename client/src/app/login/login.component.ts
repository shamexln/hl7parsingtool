import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@odx/angular/components/button';
import { FormFieldModule } from '@odx/angular/components/form-field';
import { IconComponent } from '@odx/angular/components/icon';
import { SelectModule } from '@odx/angular/components/select';
import { AuthService } from '../auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, FormFieldModule, TranslateModule, IconComponent, SelectModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = 'admin';
  password = '';
  confirmPassword = '';
  isFirstLogin = false;
  error = '';
  loading = false;
  selectedLang = 'en';

  // UI state for language selector popup
  showLangSelect = false;
  readonly languages = [
    { code: 'en', labelKey: 'LOGIN.LANGUAGE.EN' },
    { code: 'fr', labelKey: 'LOGIN.LANGUAGE.FR' },
    { code: 'de', labelKey: 'LOGIN.LANGUAGE.DE' },
    { code: 'es', labelKey: 'LOGIN.LANGUAGE.ES' },
  ];

  constructor(private auth: AuthService, private router: Router, private translate: TranslateService) {
    this.selectedLang = translate.currentLang || translate.getDefaultLang() || 'en';
  }

  ngOnInit(): void {
    // 查询后端是否需要首次初始化
    this.auth.setupRequired().subscribe(req => {
      this.isFirstLogin = !!req?.setupRequired;
      if (this.isFirstLogin && req.status == 'initial') {
        this.error = this.translate.instant('LOGIN.LOGGED_OUT');
      }
      else if (this.isFirstLogin && req.status == 'expired') {
        this.error = this.translate.instant('LOGIN.ERROR_PASSWORD_EXPIRED');
      }

    });
  }

  toggleLangSelect(): void {
    this.showLangSelect = !this.showLangSelect;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    // close when clicking outside language controls
    if (!t.closest?.('.login-lang-container')) {
      this.showLangSelect = false;
    }
  }

  setLang(lang: string): void {
    const supported = ['en','fr','de','es'];
    const use = supported.includes(lang) ? lang : 'en';
    this.translate.use(use);
    this.selectedLang = use;
    try { localStorage.setItem('hl7_lang', use); } catch {}
    this.showLangSelect = false;
  }

  submit(): void {
    this.error = '';
    this.loading = true;

    if (this.isFirstLogin) {
      // First login: you need to enter the password twice to confirm,
      if (this.password !== this.confirmPassword) {
        this.loading = false;
        this.error = this.translate.instant('MSG.PasswordMismatch');
        return;
      }

      if (this.password.length < 8) {
        this.loading = false;
        this.error = this.translate.instant('MSG.LengthNotEnough');
        return;
      }

      this.auth.setupInitial(this.username, this.password, this.confirmPassword).subscribe({
        next: (response) => {
          if (response.success) {
            // After successful initialization, perform a normal login to obtain the token.
            this.auth.login(this.username, this.password).subscribe({
              next: logged => {
                this.loading = false;
                if (logged) {
                  this.router.navigate(['/patient-query']);
                } else {
                  this.error = this.translate.instant('MSG.PasswordInvalid');
                }
              },
              error: () => {
                this.loading = false;
                this.error = this.translate.instant('MSG.PasswordInvalid');
              }
            });
          }  else  {
            this.loading = false;
            this.error = this.translate.instant('MSG.LoginFailed');
          }
        },
        error: (err) => {
          const msg = err?.error?.message;
          this.error = typeof msg === 'string'
            ? this.translate.instant(msg)
            : this.translate.instant('MSG.LoginFailed');
          this.loading = false;
        }
      });
      return;
    }

    // 非首次登录：正常登录流程
    this.auth.login(this.username, this.password).subscribe({
      next: ok => {
        this.loading = false;
        if (ok) {
          this.router.navigate(['/patient-query']);
        } else {
          this.error = this.translate.instant('MSG.PasswordInvalid');
        }
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 403 && err?.error?.passwordExpired) {
          this.error = this.translate.instant('LOGIN.ERROR_PASSWORD_EXPIRED');
          // 强制刷新页面（等同 Shift+F5）
          window.location.reload();
          return;
        }
        this.error = this.translate.instant('MSG.PasswordInvalid');
      }
    });
  }
}
