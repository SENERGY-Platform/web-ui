import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'tagValue'})

export class TagValuePipe implements PipeTransform {
    transform(value: string, prefix: string): string {
        const out = value.split(':', 2);
        return prefix + out[1];
    }
}