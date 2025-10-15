import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMainMenuLinksConfig } from '@odx/angular/components/main-menu';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { authInterceptor } from './auth.interceptor';
import { SessionIdleService } from './session-idle.service';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

export function translateInitializerFactory(translate: TranslateService) {
  return () => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('hl7_lang') : null;
    const lang = saved || (navigator?.language?.slice(0,2) || 'en');
    const supported = ['en','fr','de','es'];
    const use = supported.includes(lang) ? lang : 'en';
    translate.addLangs(supported);
    translate.setDefaultLang('en');
    translate.use(use);
  };
}

export function idleInitializerFactory(idle: SessionIdleService) {
  return () => idle.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useFactory: HttpLoaderFactory, deps: [HttpClient] }
    })),
    { provide: APP_INITIALIZER, useFactory: translateInitializerFactory, deps: [TranslateService], multi: true },
    { provide: APP_INITIALIZER, useFactory: idleInitializerFactory, deps: [SessionIdleService], multi: true },
    // Hide default footer links in ODX main menu
    provideMainMenuLinksConfig({
      legalNoticeUrl: null,
      providerIdentificationUrl: null
    })
  ]
};
