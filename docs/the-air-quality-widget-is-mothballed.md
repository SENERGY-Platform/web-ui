# The air quality widget is mothballed

## Applies when

Looking for the air quality widget, wondering why "Air Quality" is missing from "Add widget", or reviving it.
State of 2026-11-05.

**Not this if**: the widget is the Multi Value or Device Status widget. Those are disabled the same way, since 2020,
for reasons of their own.

## State

New air quality widgets cannot be created: the entry in the type list of
`modules/dashboard/dialogs/dashboard-new-widget-dialog.component.ts` is commented out. All code stays in place, so
widgets that already exist on dashboards keep rendering and can still be edited.

It was taken out because none of its three data sources worked any more, and it carries a lot of business logic
(recommendations, thresholds, pollen) that nobody maintains.

## Where the code is

| What | Where |
|---|---|
| Widget, edit dialog | `widgets/air-quality/`, `widgets/air-quality/dialog/` |
| Data sources | `widgets/air-quality/shared/`: `uba.service.ts`, `dwd-pollen.service.ts`, `geonames.service.ts`, `air-quality.service.ts` |
| Registration | `widgets/widget.module.ts`, `DashboardTypesEnum.AirQuality`, `AirQualityPropertiesModel` in `dashboard-widget.model.ts` |
| Cleanup when a widget is removed | the `DashboardTypesEnum.AirQuality` case in `modules/dashboard/dashboard.component.ts` |
| Configuration | `ubaUrl`, `geonamesUrl`, `importTypeIdUbaStation`, `importTypeIdYrForecast`, `importTypeIdDwdPollen` in the environment |

The edit dialog creates import instances and exports for the widget; how the upgrade branch releases them again is in
`docs/widget-dialogs-delete-generated-resources-after-saving.md` there.

## Reviving it

1. **UBA:** the Umweltbundesamt API moved. The old path answers `301 Moved Permanently` to
   `https://luftdaten.umweltbundesamt.de/api/air-data/v2/...` (new host, `air-data` instead of `air_data`), and the
   gateway route behind `ubaUrl` answered `503`. The route has to point to the new address.
2. **Import types:** `importTypeIdUbaStation`, `importTypeIdYrForecast` and `importTypeIdDwdPollen` must name import
   types that exist on the instance. On the instance checked, none of the three configured ids was readable, and the
   yr forecast import type that exists there has a different id.
3. Uncomment the entry in the type list.
