import {Routes} from '@angular/router';
import {PatientComponent} from './patient/patient.component';
import {ConfigurationComponent} from './configuration/configuration.component';
import {CodesystemComponent} from './codesystem/codesystem.component';
import {CodesystemdetailComponent} from './codesystemdetail/codesystemdetail.component';

export const routes: Routes = [
  {
    path: 'patient-query',
    loadComponent: () => import('./patient/patient.component')
      .then(m => m.PatientComponent)
  },
  {
    path: 'config',
    loadComponent: () => import('./configuration/configuration.component')
      .then(m => m.ConfigurationComponent)
  },
  {
    path: 'codesystem',
    loadComponent: () => import('./codesystem/codesystem.component')
      .then(m => m.CodesystemComponent)
  },
  {
    path: 'codesystem-detail/:id',
    loadComponent: () => import('./codesystemdetail/codesystemdetail.component')
      .then(m => m.CodesystemdetailComponent)
  },
  {path: '', redirectTo: '/patient-query', pathMatch: 'full'}

];
