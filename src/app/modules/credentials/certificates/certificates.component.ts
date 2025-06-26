/*
 * Copyright 2025 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CertificateInfo, Rfc5280Reason, rfc5280ReasonString } from './shared/certificates.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CertificatesService } from './shared/certificates.service';
import { concatMap, map, Observable, Subscription } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { CertificateRevokeDialogComponent } from './certificate-revoke-dialog/certificate-revoke-dialog.component';

@Component({
  selector: 'app-certificates',
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.css'
})
export class CertificatesComponent implements OnInit, OnDestroy, AfterViewInit {

  dataReady = false;
  displayedColumns = ['serial_number', 'sans', 'issued_at', 'not_before', 'expiry', 'revoked_at', 'reason'];
  pageSize = this.preferencesService.pageSize;
  dataSource = new MatTableDataSource<CertificateInfo>();
  @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
  rfc5280ReasonString = rfc5280ReasonString;
  userHasRevokeAuthorization = this.certificatesService.userHasRevokeAuthorization();
  certs: CertificateInfo[] = [];
  searchSub?: Subscription;

  @ViewChild(MatSort) sort?: MatSort;


  constructor(
    private preferencesService: PreferencesService,
    private certificatesService: CertificatesService,
    private searchbarService: SearchbarService,
    private dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.initSearch();
    if (this.userHasRevokeAuthorization) {
      this.displayedColumns.push('revoke');
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngAfterViewInit() {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    this.paginator.page.subscribe((e) => {
      this.preferencesService.pageSize = e.pageSize;
      this.pageSize = this.paginator.pageSize;
    });
  }

  revoke(cert: CertificateInfo) {
    const dialogRef = this.dialog.open(CertificateRevokeDialogComponent);
    dialogRef.afterClosed().subscribe((res: Rfc5280Reason | null | undefined) => {
      if (res !== null && res !== undefined) {
        this.certificatesService.revoke(cert, res).pipe(concatMap(_ => this.reload())).subscribe();
      }
    });
  }

  private reload(): Observable<unknown> {
    this.dataReady = false;
    return this.certificatesService.list().pipe(map(certs => {
      this.certs = certs.sort((a, b) => a.issued_at < b.issued_at ? 1 : -1);
      this.dataSource.data = this.certs;
      this.dataReady = true;
    }));
  }

  private initSearch() {
    this.searchSub = this.searchbarService.currentSearchText.pipe(
      concatMap((searchText: string) => this.reload().pipe(map(_ => searchText))),
    ).subscribe(searchText => {
      this.dataSource.data = this.certs.filter(c => {
        if (c.serial_number.indexOf(searchText) !== -1) {
          return true;
        }
        if (c.sans.filter(san => san.indexOf(searchText) !== -1).length > 0) {
          return true;
        }
        return false;
      });
    });
  }
}
