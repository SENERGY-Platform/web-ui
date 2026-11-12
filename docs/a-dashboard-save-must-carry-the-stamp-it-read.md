# A dashboard save must carry the stamp it read

## Applies when

Adding or changing any code that writes a whole dashboard through `DashboardService.updateDashboard`
(`src/app/modules/dashboard/shared/dashboard.service.ts`) while the page keeps the dashboard object and may write it
again.

**Not this if**: the write is a widget write. Widgets use their own endpoints (`/widgets/...`) and this page does
not take a stamp from them. What a dashboard update does to fields that were not sent is a backend question; the shared
knowledge vault has a note "Updating a dashboard replaces every field of it".

## The rule

The dashboard service versions a dashboard by `updatedAt` (`shared/dashboard.model.ts`) and refuses a write that
carries a stale one; the page then sees the failed save (`updateDashboard` maps an error to `null`). Every save
answers with the dashboard including its new `updatedAt`. A write path must copy that stamp from the response into the
dashboard object the page keeps, or the second write from the same page is sent with the old stamp and fails. Only the
first change of a session would work.

A new write path therefore either goes through `persistDashboard` in `dashboard.component.ts`, which does this, or
does it itself for every response it gets, including the ones of a revert.

## Paths that do this

All in `src/app/modules/dashboard/`:

- `persistDashboard` (`dashboard.component.ts`) takes the stamp in a `tap`. Its callers are `refreshTime`,
  `selectLayoutMode` and `selectColumns`. On a failed save it also runs a revert callback and shows a snack bar.
- `moveDashboard` writes two dashboards (the moved one and its neighbour) and takes the stamp of each from its
  response. If one write failed, the half that was written is written back, again taking the stamp.
- Editing a dashboard in its dialog (`openEditDashboardDialog` in `shared/dashboard.service.ts`) works on a copy and
  replaces the held dashboard with the response (`manipulateDashboard` with `Update`, handled by `updateDashboard` in
  the component), so the new stamp arrives with it.

Specs: `dashboard.component.spec.ts` has a "takes the fresh updatedAt" case for the refresh time, the layout mode and
the double move; add one for a new path.
