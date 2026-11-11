/*
 * Copyright 2026 InfAI (CC SES)
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogConfig, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MtxSelect } from '@ng-matero/extensions/select';
import { Observable } from 'rxjs';
import { DialogHeaderComponent } from '../../../../../core/components/dialog-header/dialog-header.component';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { dialogSize } from '../../../../../core/dialog-size';
import { SmartServiceDesignModel } from '../../../designs/shared/design.model';
import { SmartServiceReleasesService } from '../../shared/release.service';
import { SmartServiceReleaseCreateModel, SmartServiceReleaseModel } from '../../shared/release.model';

export interface ReleaseDesignDialogData {
    design: SmartServiceDesignModel;
}

interface Candidate {
    id: string;
    label: string;
}

/**
 * Asks for name and description of a new release and, optionally, for the release it updates
 * (update_of, SNRGY-4535): a design built again from a release after its own design was deleted
 * would otherwise start a release without an update path for the instances. Offered are the
 * current releases of the user from other designs; a design that already has a release of its
 * own continues that one, so the choice is not offered then.
 */
@Component({
    templateUrl: './release-design-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DialogHeaderComponent, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatHint, MatInput, FormsModule,
        MtxSelect, MatDialogActions, MatButton],
})
export class ReleaseDesignDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<ReleaseDesignDialogComponent, SmartServiceReleaseCreateModel | null>>(MatDialogRef);
    private releaseService = inject(SmartServiceReleasesService);
    private authorizationService = inject(AuthorizationService);
    private changeDetector = inject(ChangeDetectorRef);
    private design = inject<ReleaseDesignDialogData>(MAT_DIALOG_DATA).design;

    name = this.design.name;
    description = this.design.description;
    updateOf: string | null = null;
    candidates: Candidate[] = [];
    /** the release the design already has; a new release continues it */
    ownRelease: SmartServiceReleaseModel | null = null;
    loading = true;

    ngOnInit(): void {
        this.releaseService.getReleaseList(9999, 0, '', 'w', true).subscribe(({ releases }) => {
            const userId = this.authorizationService.getUserId();
            this.ownRelease = releases.find((r) => r.design_id === this.design.id) || null;
            this.candidates = releases
                .filter((r) => r.design_id !== this.design.id && r.creator === userId)
                .map((r) => ({ id: r.id, label: r.description ? r.name + ' - ' + r.description : r.name }))
                .sort((a, b) => a.label.localeCompare(b.label));
            this.loading = false;
            this.changeDetector.markForCheck();
        });
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    ok(): void {
        const result: SmartServiceReleaseCreateModel = { design_id: this.design.id, name: this.name, description: this.description };
        if (this.updateOf && !this.ownRelease) {
            result.update_of = this.updateOf;
        }
        this.dialogRef.close(result);
    }
}

/** opens the release dialog; it closes with the release to create, or null */
export function openReleaseDesignDialog(dialog: MatDialog, design: SmartServiceDesignModel): Observable<SmartServiceReleaseCreateModel | null | undefined> {
    const config = new MatDialogConfig<ReleaseDesignDialogData>();
    Object.assign(config, dialogSize('m'));
    config.autoFocus = true;
    config.data = { design };
    return dialog.open(ReleaseDesignDialogComponent, config).afterClosed();
}
