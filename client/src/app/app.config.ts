import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMainMenuLinksConfig } from '@odx/angular/components/main-menu';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    // Hide default footer links in ODX main menu
    provideMainMenuLinksConfig({
      legalNoticeUrl: null,
      providerIdentificationUrl: null
    })
  ]
};
