import {Component, OnInit} from '@angular/core';
import {ButtonComponent, ButtonVariant} from '@odx/angular/components/button';
import {CodesystemService} from '../codesystem.service';
import {CodesystemMockService} from '../mock/codesystem-mock';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {Router} from '@angular/router';
import { getCodesystemDisplayName } from '../shared/codesystem-name.util';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-codesystem',
  imports: [
    ButtonComponent,
    TranslateModule,
    AreaHeaderComponent
  ],
  templateUrl: './codesystem.component.html',
  styleUrl: './codesystem.component.css'
})
export class CodesystemComponent implements OnInit {

  public variantValue = ButtonVariant.SECONDARY;
  public codesystems: any[] = [];

  // Expose shared helper for template usage
  public getCodesystemDisplayName = getCodesystemDisplayName;

  constructor(private codesystemService: CodesystemService, private router: Router
  ) {
  }

  ngOnInit(): void {
    // Load codesystems when component initializes
    this.fetchCodesystems();
  }

  fetchCodesystems() {

    this.codesystemService.getCodesystem().subscribe({
      next: (response) => {
        this.codesystems = response;
        console.log('Codesystem data:', response);
      },
      error: (error) => {
        console.error('Error fetching codesystem data:', error);
      }
    });
  }


  getCodesystemDetial(id: string, codesystemname: string) {

    this.router.navigate(
      ['/codesystem-detail', id],
      {queryParams: {codesystemname: codesystemname}}
    );
  }
}
