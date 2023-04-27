/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import {Pipe, PipeTransform} from '@angular/core';

@Pipe({ name: 'short_process_io_key' })
export class ShortKeyPipe implements PipeTransform {
    transform(key: string, definitionId: string, instanceId: string) {
        let result = key;
        if(instanceId && result.startsWith(instanceId)){
            result = result.slice(instanceId.length);
        }
        if(instanceId && result.startsWith('_')){
            result = result.slice(1);
        }
        if(definitionId && result.startsWith(definitionId)){
            result = result.slice(definitionId.length);
        }
        if(definitionId && result.startsWith('_')){
            result = result.slice(1);
        }
        return result;
    }
}
