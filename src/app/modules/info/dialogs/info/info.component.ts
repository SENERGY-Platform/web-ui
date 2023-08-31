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
  
  constructor(
    private dialogRef: MatDialogRef<InfoDialogComponent>,
  ) {
    this.commit = environment.commit
  }

  close(): void {
    this.dialogRef.close();
  }
}
