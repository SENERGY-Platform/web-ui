import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { InfoDialogComponent } from '../dialogs/info/info.component';

@Injectable({
    providedIn: 'root'
})
export class InfoService {

    constructor(
    private dialog: MatDialog
    ) { }

    openInfoDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        // dialogConfig.data = {
        //     name: name,
        //     permissions: permissionsIn,
        // };
        const editDialogRef = this.dialog.open(InfoDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe(() => {});
    }
}
