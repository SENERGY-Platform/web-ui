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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from 'src/environments/environment';
import { CertificateInfo, Rfc5280Reason, rfc5280ReasonString } from './certificates.model';


@Injectable({
  providedIn: 'root'
})
export class CertificatesService {
  listAuthorizations: PermissionTestResponse;
  revokeAuthorizations: PermissionTestResponse;


  constructor(
    private http: HttpClient,
    private ladonService: LadonService,
  ) {
    this.listAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.certAuthorityUrl + '/list');
    this.revokeAuthorizations = this.ladonService.getUserAuthorizationsForURI(environment.certAuthorityUrl + '/revoke');
  }

  userHasRevokeAuthorization(): boolean {
    return this.revokeAuthorizations['POST'];
  }

  userHasListAuthorization(): boolean {
    return this.listAuthorizations['GET'];
  }

  list(): Observable<CertificateInfo[]> {
    return this.http.get<CertificateInfo[]>(environment.certAuthorityUrl + '/list').pipe(
      map(certs => {
        const now = new Date().valueOf();
        certs.forEach(cert => {
          cert.expired = now > new Date(cert.expiry).valueOf();
          cert.revoked = new Date(cert.revoked_at).valueOf() > 1;
        });
        return certs;
      }),
    );
  }

  revoke(cert: CertificateInfo, reason: Rfc5280Reason): Observable<unknown> {
    return this.http.post(environment.certAuthorityUrl + '/revoke', {
      serial: cert.serial_number,
      authority_key_id: cert.authority_key_identifier,
      reason: rfc5280ReasonString(reason),
    });
  }
}
