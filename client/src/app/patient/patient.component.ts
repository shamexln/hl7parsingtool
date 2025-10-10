import {ChangeDetectionStrategy, Component, computed, Input, input, OnDestroy, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {PatientService} from '../patient.service';
import {CommonModule} from '@angular/common';
import {saveAs} from 'file-saver';
import {ButtonComponent} from '@odx/angular/components/button';
import {MainMenuModule} from '@odx/angular/components/main-menu';
import {AreaHeaderComponent} from '@odx/angular/components/area-header';
import {TableVariant} from '@odx/angular/components/table';
import {DataTableModule} from '@odx/angular/components/data-table';
import {PageChangeEvent, PaginatorModule} from '@odx/angular/components/paginator';
import {FormFieldComponent, FormFieldVariant} from '@odx/angular/components/form-field';
import {DatepickerModule} from '@odx/angular/components/datepicker';
import {SelectComponent, SelectModule, SelectOptionComponent} from '@odx/angular/components/select';
import {Subscription} from 'rxjs';
import {CoreModule} from '@odx/angular';

interface TableData {
  row_id: string;
  device_id: string;
  local_time: string;
  Date: string;
  Time: string;
  Hour: string;
  bed_label: string;
  pat_ID: string;
  mon_unit: string;
  care_unit: string;
  alarm_grade: string;
  alarm_state: string;
  'Alarm Grade 2': string;
  alarm_message: string;
  param_id: string;
  param_value: string;
  param_uom: string;
  param_upper_lim: string;
  param_lower_lim: string;
  Limit_Violation_Type: string;
  Limit_Violation_Value: string;
  sourcechannel: string;
  onset_tick: string;
  alarm_duration: string;
  'change_time(UTC)': string;
  change_tick: string;
  aborted: string;
}

interface OptionValue {
  label: string;
  value: number;
  disabled: boolean;
}

@Component({
  selector: 'app-patient',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CoreModule,
    CommonModule,
    FormsModule,
    ButtonComponent,
    MainMenuModule,
    HttpClientModule,
    AreaHeaderComponent,
    DataTableModule,
    PaginatorModule,
    FormFieldComponent,
    DatepickerModule,
    SelectOptionComponent,
    SelectComponent,
    SelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './patient.component.html',
  styleUrls: ['./patient.component.css']
})
export class PatientComponent implements OnInit {
  selectOptions: OptionValue[] = [
    {value: 5, label: '5', disabled: false},
    {value: 10, label: '10', disabled: false},
    {value: 20, label: '20', disabled: false},
    {value: 50, label: '50', disabled: false},
    {value: 100, label: '100', disabled: false}
  ];
  pageSizeValue: OptionValue = this.selectOptions[4];
  patientData = signal<any[]>([]);
  errorMessage = '';
  page = 1;
  pageSize: number = this.pageSizeValue.value;
  totalPages = 0;
  totalItems = 0;
  previousPageIndex = 0; // 默认第一页索引通常为0
  fieldstyle = FormFieldVariant.SIMPLE;

  formGroup = new FormGroup({
    patientid: new FormControl('', [Validators.required]),
    startdate: new FormControl(new Date(), [Validators.required]),
    enddate: new FormControl(new Date(), [Validators.required]),
    pageSizeValue: new FormControl<OptionValue | null>(this.pageSizeValue, [Validators.required]),
  });


  constructor(private patientService: PatientService) {

  }

  ngOnInit(): void {
    this.queryPatient(1);
  }

  private subscription = new Subscription();

  public variantValue = TableVariant.STRIPED;

  private filteredData(): TableData[] {
    const data: TableData[] = [];
    // 从信号获取最新值
    const patientDataArray = this.patientData();

    if (patientDataArray && Array.isArray(patientDataArray)) {
      patientDataArray.forEach((patient: any) => {
        data.push({
          row_id: patient.id || '',
          device_id: patient.device_id || '',
          local_time: patient.local_time || '',
          Date: patient.Date || '',
          Time: patient.Time || '',
          Hour: patient.Hour || '',
          bed_label: patient.bed_label || '',
          pat_ID: patient.pat_ID || '',
          mon_unit: patient.mon_unit || '',
          care_unit: patient.care_unit || '',
          alarm_grade: patient.alarm_grade || '',
          alarm_state: patient.alarm_state || '',
          'Alarm Grade 2': patient['Alarm Grade 2'] || '',
          alarm_message: patient.alarm_message || '',
          param_id: patient.param_id || '',
          param_value: patient.param_value || '',
          param_uom: patient.param_uom || '',
          param_upper_lim: patient.param_upper_lim || '',
          param_lower_lim: patient.param_lower_lim || '',
          Limit_Violation_Type: patient.Limit_Violation_Type || '',
          Limit_Violation_Value: patient.Limit_Violation_Value || '',
          sourcechannel: patient.sourcechannel || '',
          onset_tick: patient.onset_tick || '',
          alarm_duration: patient.alarm_duration || '',
          'change_time(UTC)': patient['change_time(UTC)'] || '',
          change_tick: patient.change_tick || '',
          aborted: patient.aborted || '',
        });
      });
    } else {
      console.error('patientData is invalid or empty.', patientDataArray);
    }

    return data;
  }

  public variant = input.required<TableVariant>();
  public paginationParams = signal<PageChangeEvent>({
    pageSize: this.pageSize,
    length: this.totalItems,
    pageIndex: this.page,
  });

  public dataSource = computed<TableData[]>(() => this.filteredData());


  public displayedColumns = ['row_id', 'device_id', 'local_time', 'Date', 'Time', 'Hour', 'bed_label', 'pat_ID', 'mon_unit',
    'care_unit', 'alarm_grade', 'alarm_state', 'Alarm Grade 2', 'alarm_message', 'param_id', 'param_value',
    'param_uom', 'param_upper_lim', 'param_lower_lim', 'Limit_Violation_Type', 'Limit_Violation_Value', 'sourcechannel',
    'onset_tick', 'alarm_duration', 'change_time(UTC)', 'change_tick', 'aborted'];


  @Input()
  stringify = (item: OptionValue | null): string => {
    return item?.label ?? '';
  };


  @Input()
  identityMatcher = (item1: OptionValue | null, item2: OptionValue | null): boolean => {
    if (item1 == null || item2 == null) {
      return false; // 或其他逻辑
    }
    return item1.value === item2.value;
  };


  queryPatient(page: number = 1) {
    this.errorMessage = '';
    this.patientData.set([]);

    const {patientid, startdate, enddate} = this.formGroup.value;
    // @ts-ignore
    const formattedStartDate = formatDateToSql(startdate);
    // @ts-ignore
    const formattedEndDate = formatDateToSql(enddate);

    this.patientService.getPaginatedPatientById(patientid, page, this.pageSize, formattedStartDate, formattedEndDate).subscribe({
      next: (data) => {
        const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (result) {
          /*this.patientData = result.rows || [];*/
          this.patientData.set(result.rows || []); // 设置新数据（响应式的信号更新）
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
          this.patientData.set([]);
          this.errorMessage = 'Server returned invalid data format';
          console.error("Server returned invalid data format", data);
        }

      },
      error: (err) => {
        this.patientData.set([]);
        this.errorMessage = err.message;
        console.error(err);
      },
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

    this.queryPatient(this.page); // 调用API重新加载对应页的数据
  }

  handlePageSizeChange() {
    // Update pageSizeValue with the current form control value
    this.pageSize = this.formGroup.get('pageSizeValue')?.value?.value ?? this.selectOptions[1].value;
    console.log(this.pageSizeValue);

    this.page = 1;
    this.queryPatient(this.page);
  }

  exportAllDataToExcel() {
    const {patientid, startdate, enddate} = this.formGroup.value;
    // @ts-ignore
    const formattedStartDate = formatDateToSql(startdate);
    // @ts-ignore
    const formattedEndDate = formatDateToSql(enddate);
    this.patientService.exportAllDataToExcel(patientid, formattedStartDate, formattedEndDate).subscribe({
      next: (blobData: Blob) => {
        const fileName = 'patients_data';
        saveAs(blobData, `${fileName}_${new Date().getTime()}.${EXCEL_EXTENSION}`);
      },
      error: (err) => {
        console.error('export to database fail', err);
        alert('export all data fail！');
      }
    });
  }
}

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = 'xlsx';

function formatDateToSql(date: Date): string {
  const year = date.getFullYear();

  // getMonth() 返回的月份是从 0 开始的 (0 代表一月), 所以需要加 1
  // toString().padStart(2, '0') 用于确保月份是两位数 (例如 '05' 而不是 '5')
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // getDate() 返回的是月份中的第几天
  // toString().padStart(2, '0') 用于确保天数是两位数
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;

}

