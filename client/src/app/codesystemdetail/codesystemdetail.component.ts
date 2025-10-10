import {Component, computed, OnInit, signal} from '@angular/core';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {CodesystemService} from '../codesystem.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PageChangeEvent, PaginatorModule} from '@odx/angular/components/paginator';
import {DataTableModule} from '@odx/angular/components/data-table';
import {TableVariant} from '@odx/angular/components/table';
import {FormFieldModule} from '@odx/angular/components/form-field';
import {ButtonVariant} from '@odx/angular/components/button';
import {FormsModule} from '@angular/forms';
import {debounceTime, Subject} from 'rxjs';


interface TableData {
  row_id: string;
  tagkey: string;
  observationtype: string;
  datatype: string;
  encode: string;
  parameterlabel: string;
  encodesystem: string;
  subid: string;
  description: string;
  source: string;
  channel: string;
  channelid: string;
}

@Component({
  selector: 'app-codesystemdetail',
  imports: [
    AreaHeaderComponent,
    PaginatorModule,
    DataTableModule,
    FormFieldModule,
    FormsModule,
  ],
  templateUrl: './codesystemdetail.component.html',
  standalone: true,
  styleUrl: './codesystemdetail.component.css'
})
export class CodesystemdetailComponent implements OnInit {
  public filterText = signal<string>('');
  public codesystemData = signal<any[]>([]);
  public originalcodesystemData: TableData[] = [];
  public errorMessage = '';
  public id: string = '';
  public codesystemName: string = '';
  public page = 1;
  public pageSize = 1000;
  public totalPages = 0;
  public totalItems = 0;
  previousPageIndex = 0; // 默认第一页索引通常为0
  public paginationParams = signal<PageChangeEvent>({
    pageSize: this.pageSize,
    length: this.totalItems,
    pageIndex: this.page,
  });
  public variantValue = ButtonVariant.SECONDARY;
  public tablevariantValue = TableVariant.STRIPED;
  private descriptionInput$ = new Subject<{ tagkey: string, val: string }>();

  constructor(
    private codesystemService: CodesystemService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.descriptionInput$.pipe(
      debounceTime(1000) 
    ).subscribe(({tagkey, val}) => {
      this.onEditDescription(tagkey, val);
    });

  }

  private filteredData(): TableData[] {
    const data: TableData[] = [];
    // 从信号获取最新值
    const codesystemDataArray = this.codesystemData();

    if (codesystemDataArray && Array.isArray(codesystemDataArray)) {
      codesystemDataArray.forEach((codesystem: any) => {
        data.push({
          row_id: codesystem.id || '',
          tagkey: codesystem.tagkey || '',
          observationtype: codesystem.observationtype || '',
          datatype: codesystem.datatype || '',
          encode: codesystem.encode || '',
          parameterlabel: codesystem.parameterlabel || '',
          encodesystem: codesystem.encodesystem || '',
          subid: codesystem.subid || '',
          description: codesystem.description || '',
          source: codesystem.source || '',
          channel: codesystem.channel || '',
          channelid: codesystem.channelid || '',

        });
      });
    } else {
      console.error('codesystem is invalid or empty.', codesystemDataArray);
    }

    return data;
  }

  public dataSource = computed<TableData[]>(() => this.filteredData().filter((data) =>
    data.description.toLowerCase().includes(this.filterText().toLowerCase())));


  public displayedColumns = ['row_id', 'observationtype', 'datatype', 'encode', 'parameterlabel', 'encodesystem', 'subid', 'description',
    'source', 'channel', 'channelid'];


  ngOnInit(): void {
    // Get the id parameter from the route
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') || '';
      console.log('id:', this.id);
    });

    this.route.queryParamMap.subscribe(params => {
      this.codesystemName = params.get('codesystemname') || '';
      console.log('codesystemname:', this.codesystemName);
    });

    if (this.id && this.codesystemName) {
      this.queryCodesystemDetail(this.id, this.codesystemName);
    }
  }

  onDescriptionInput(tagkey: string, val: string) {
    // 输入变化时调用
    this.descriptionInput$.next({tagkey, val});
  }


  onEditDescription(tagkey: string, newVal: string) {
    // find the data from this.originalcodesystemData by tagkey
    const data = this.originalcodesystemData.find((item: any) => item.tagkey === tagkey);
    if (data?.description != newVal) {
      // deep copy data to new variant named newdata
      const newdata = JSON.parse(JSON.stringify(data));
      newdata.description = newVal;
      const arr: (TableData | undefined)[] = Array.of(newdata);
      if (Array.isArray(arr) && arr.every(item => item !== undefined)) {
        this.submitChanges(arr);
      }
    }
  }

  submitChanges(data: TableData[]) {

    console.log('submit changed data:');

    this.codesystemService.updateCodesystem(this.codesystemName, data).subscribe(result => {
      console.log('update codesystem successfully:', result);
      // pop-up dialog tell user how many data are updaed.
      if (result.success) {
        window.alert(`Total ${result.updated} data are updated.`);

      }
      this.queryCodesystemDetail(this.id, this.codesystemName, this.page);

    });

  }

  onPageChange(event: PageChangeEvent): void {
    const currentPageIndex = event.pageIndex;

    if (currentPageIndex > this.previousPageIndex) {
      console.log('next page →');
    } else if (currentPageIndex < this.previousPageIndex) {
      console.log('← previous page');
    } else {
      console.log('page not changed');
    }

    this.previousPageIndex = currentPageIndex; // 更新页码记录

    // 更新当前页状态，用于后端API请求
    this.page = currentPageIndex + 1;
    this.pageSize = event.pageSize;

    this.paginationParams.set({
      pageSize: this.pageSize,
      length: this.totalItems,
      pageIndex: currentPageIndex
      ,
    });

    this.queryCodesystemDetail(this.id, this.codesystemName, this.page); // 调用API重新加载对应页的数据
  }

  queryCodesystemDetail(id: string, codesystemname: string, page: number = 1) {
    this.errorMessage = '';
    this.codesystemData.set([]);

    this.codesystemService.getPaginatedCodesystemDetailById(id, codesystemname, page, this.pageSize).subscribe({
      next: (data) => {
        const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (result) {

          this.codesystemData.set(result.rows || []); // 设置新数据（响应式的信号更新）
          this.originalcodesystemData = JSON.parse(JSON.stringify(result.rows));

          this.page = result.page;
          this.pageSize = result.pageSize;
          this.totalPages = result.totalPages;
          this.totalItems = result.total;

          this.paginationParams.set({
            pageSize: this.pageSize,
            length: this.totalItems,
            pageIndex: this.page - 1,
          });


        } else {
          this.codesystemData.set([]);
          this.errorMessage = 'Server returned invalid data format';
          console.error("Server returned invalid data format", data);
        }

      },
      error: (err) => {
        this.codesystemData.set([]);
        this.errorMessage = err.message;
        console.error(err);
      },
    });
  }

}
