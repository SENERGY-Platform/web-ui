import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoDialogComponent {
  commit: string = ""
  version: string = ""

  constructor(
    private dialogRef: MatDialogRef<InfoDialogComponent>,
  ) {
    this.commit = environment.commit
    this.version = environment.version
  }

  close(): void {
    this.dialogRef.close();
  }
}
