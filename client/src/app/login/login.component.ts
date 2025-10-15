import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@odx/angular/components/button';
import { IconComponent } from '@odx/angular/components/icon';
import { AuthService } from '../auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  confirmPassword = '';
  isFirstLogin = false;
  error = '';
  loading = false;
  selectedLang = 'en';

  constructor(private auth: AuthService, private router: Router, private translate: TranslateService) {
    this.selectedLang = translate.currentLang || translate.getDefaultLang() || 'en';
  }

  ngOnInit(): void {
    // 查询后端是否需要首次初始化
    this.auth.setupRequired().subscribe(req => {
      this.isFirstLogin = !!req;
    });
  }

  setLang(lang: string): void {
    const supported = ['en','fr','de','es'];
    const use = supported.includes(lang) ? lang : 'en';
    this.translate.use(use);
    try { localStorage.setItem('hl7_lang', use); } catch {}
  }

  submit(): void {
    this.error = '';
    this.loading = true;

    if (this.isFirstLogin) {
      // 首次登录：需要二次输入密码确认，然后调用初始化接口
      if (this.password !== this.confirmPassword) {
        this.loading = false;
        const msg = this.translate.instant('LOGIN.ERROR_PASSWORD_MISMATCH');
        this.error = msg && msg !== 'LOGIN.ERROR_PASSWORD_MISMATCH' ? msg : 'Passwords do not match';
        return;
      }
      this.auth.setupInitial(this.username, this.password, this.confirmPassword).subscribe({
        next: ok => {
          if (ok) {
            // 初始化成功后，执行正常登录获取 token
            this.auth.login(this.username, this.password).subscribe({
              next: logged => {
                this.loading = false;
                if (logged) {
                  this.router.navigate(['/patient-query']);
                } else {
                  this.error = this.translate.instant('LOGIN.ERROR_INVALID');
                }
              },
              error: () => {
                this.loading = false;
                this.error = this.translate.instant('LOGIN.ERROR_INVALID');
              }
            });
          } else {
            this.loading = false;
            const msg = this.translate.instant('LOGIN.ERROR_SETUP_FAILED');
            this.error = msg && msg !== 'LOGIN.ERROR_SETUP_FAILED' ? msg : 'Initial setup failed';
          }
        },
        error: () => {
          this.loading = false;
          const msg = this.translate.instant('LOGIN.ERROR_SETUP_FAILED');
          this.error = msg && msg !== 'LOGIN.ERROR_SETUP_FAILED' ? msg : 'Initial setup failed';
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
          this.error = this.translate.instant('LOGIN.ERROR_INVALID');
        }
      },
      error: () => {
        this.loading = false;
        this.error = this.translate.instant('LOGIN.ERROR_INVALID');
      }
    });
  }
}
