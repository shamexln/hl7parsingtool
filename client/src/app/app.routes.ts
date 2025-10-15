import {Routes} from '@angular/router';
import {PatientComponent} from './patient/patient.component';
import {ConfigurationComponent} from './configuration/configuration.component';
import {CodesystemComponent} from './codesystem/codesystem.component';
import {CodesystemdetailComponent} from './codesystemdetail/codesystemdetail.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'patient-query',
    canActivate: [authGuard],
    loadComponent: () => import('./patient/patient.component')
      .then(m => m.PatientComponent)
  },
  {
    path: 'config',
    canActivate: [authGuard],
    loadComponent: () => import('./configuration/configuration.component')
      .then(m => m.ConfigurationComponent)
  },
  {
    path: 'codesystem',
    canActivate: [authGuard],
    loadComponent: () => import('./codesystem/codesystem.component')
      .then(m => m.CodesystemComponent)
  },
  {
    path: 'codesystem-detail/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./codesystemdetail/codesystemdetail.component')
      .then(m => m.CodesystemdetailComponent)
  },
  {path: '', redirectTo: 'login', pathMatch: 'full'}

];
