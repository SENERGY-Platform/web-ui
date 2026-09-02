# A delete reports success by status, not by body

## Applies when

Writing or reading a service method that deletes something and answers the
component with a boolean — `deleteFunction`, `deleteConcept`, `deleteLocation`
and the six others shaped like them.

**Not this if**: the method already returns `{ status: number }`
(`NetworksService.delete`, `ProcessIoService.remove`) or the model it deleted
(`DeviceInstancesService.deleteDeviceInstance`). Those carry the outcome in the
value and are read correctly where they are used.

## The body is not a contract

`this.http.delete<boolean>(url)` types the **response body**, it does not produce
one. The device-repository is not uniform about what it puts there:

- `functions`, `concepts`, `device-classes`, `device-groups` answer an accepted
  delete with `200` and **no body**
- `aspects`, `characteristics`, `locations`, `device-types`, `devices` answer with
  the JSON body `true`

Angular turns an empty body into `null`. A component testing `resp === true` — all
of them did — therefore showed `Error while deleting the function!` after a delete
the platform had carried out, on exactly the four endpoints that write no body.
The other four worked by accident, and would break the day someone tidies up the
handler.

So the delete pipes `map(() => true)` off the response and lets `catchError`
produce the `false`: the HTTP status decides, which is the one thing every one of
these endpoints does state.

```ts
return this.http
    .delete(environment.deviceRepoUrl + '/functions/' + functionId, { observe: 'response' })
    .pipe(
        map(() => true),
        catchError(this.errorHandlerService.handleError(FunctionsService.name, 'deleteFunction', false)),
    );
```

## The bulk check inherited the same assumption

Every `deleteMultipleItems` scored its `forkJoin` with

```ts
const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
```

which reads a `{ status }` or a model-or-`null` correctly and a boolean **inverted
in both directions**: success (`null`) counted as a failure, and the `false` from
`catchError` counted as a success — so a delete the repository refused was
reported as done. Where the jobs are booleans the check is
`deletionJobResults.every((r: boolean) => r === true)`.

Import instances and import types are a third case: their service returns
`Observable<void>` with no `catchError`, so a failure never reaches a `next`
handler at all. There the outcome is the stream, and the bulk path subscribes with
`next`/`error` instead of inspecting a value.
