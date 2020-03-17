/*
 * Copyright 2020 InfAI (CC SES)
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

import {Injectable, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {debounceTime} from 'rxjs/internal/operators';

@Injectable({
  providedIn: 'root'
})
export class SearchbarService {

  private searchText = new BehaviorSubject('');

  @Output() currentSearchText = this.searchText.asObservable().pipe(debounceTime(300));

  constructor() {
  }

  changeMessage(message: string): void {
    this.searchText.next(message);
  }



}
