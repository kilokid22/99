# 99 export format: `99-growdata` v1

This is the default export, labeled **"Send to Grok Bot (optimized)"** in the app (Export screen, reachable from the More sheet (bottom nav → More → Export), Analysis → Export, and Settings).
It is compact, machine-first JSON: short keys, units declared once, `null` for anything missing, and no prose apart from the user's own notes.

File name: `99-growdata-d<first>-<last>.json` (MIME type `application/json`, minified).

## Top level

| key | type | meaning |
|---|---|---|
| `format` | `"99-growdata"` | constant, used to identify the file |
| `schema_version` | `1` | bumped on breaking changes |
| `exported_at` | ISO-8601 UTC string | export time |
| `note` | string | constant: `"AlmondGold run data for analysis"` |
| `selection` | object | `{mode, days:[int], include:[str]}`. `mode` is one of `week`, `days`, `stage`, `range`, `all`. `include` lists the enabled data toggles: `readings`, `checks`, `mix`, `notes`, `adj`, `targets`, `photos` |
| `run_meta` | object | see below |
| `units` | object | units for every numeric field, declared once |
| `check_keys` | object | legend for check keys (only present if `checks` is included) |
| `targets_by_day` | object | `{ "<day>": targets }` (only present if `targets` is included) |
| `days` | array | one object per selected day, ascending, **including days with no log** (their readings are empty, so missed days are visible) |

### `run_meta`
`app` ("99"), `app_version`, `grow` ("AlmondGold"), `plant`, `strain`, `type` (`auto`|`photo`), `tent`, `system` (e.g. "5.5 gal DWC, RO water"), `light` ("18/6"), `day1` (YYYY-MM-DD or null), `today_day` (int or null), `harvest_day` (int, default 70), `res_change_days` ([int], last = flush), `co2` (bool), `leaf_offset_F` (number), `source` (run sheet title).

### `units`
| field | unit |
|---|---|
| `t` | HH:MM, phone local time |
| `ph` | pH |
| `ec_uScm` | µS/cm |
| `water_F`, `air_F` | °F |
| `rh` | % |
| `vpd` | kPa, leaf VPD auto-computed from `air_F` and `rh` with leaf temp = air − `leaf_offset_F` (Tetens SVP) |
| `co2` | ppm |
| `ppfd` | µmol/m²/s at the canopy top |
| `mix_ml` | ml for the whole `gal_total` reservoir |
| ranges | `[min,max]`; a single number means an exact target (PPFD) |

### `targets_by_day["<d>"]`
`stage`, `ph`, `ec_uScm`, `water_F`, `air_F`, `rh`, `vpd` (each `[min,max]` or `null`), `ppfd` (number or `null` while the seed is in the dark), `co2` (`[1000,1200]` only on the CO2 path, otherwise `null`), `tasks` ([str]: that day's run-sheet actions, matching check keys `a1..aN` in order; present when `checks` is included).

The EC target follows the mix **actually in the bucket**: it comes from the most recent res-change day ≤ d, whose position in `res_change_days` gives the mix week. The flush week is `[0,300]`.

## `days[]`

| key | type | notes |
|---|---|---|
| `day` | int 1–70 | |
| `week` | int 1–10 | `ceil(day/7)` |
| `date` | YYYY-MM-DD \| null | null while `day1` is unset |
| `stage` | string | run-sheet stage |
| `res_change` | bool | this day is in `res_change_days` |
| `mix_week_in_res` | int \| null | which week's mix is in the bucket (10 = flush) |
| `readings` | array | `[{t, ph, ec_uScm, water_F, air_F, rh, vpd, co2, ppfd}]`, in entry order. **The last entry is the one graded.** Untouched fields are `null`, and values pre-filled from yesterday are never exported unless the user confirmed them |
| `grades` | object | per metric (`ph`, `ec_uScm`, `water_F`, `air_F`, `rh`, `vpd`, `ppfd`, `co2`): `"ok"` (in range), `"warn"` (close), `"bad"` (off), or `null` (no value or no target) |
| `checks` | object | `{done:[key], missed:[key]}`, see `check_keys` |
| `score` | object | `{met, close, missed, graded, tasks_done, tasks_total, status}` |
| `mix_ml` | object \| null | `{week, gal_total, ml:{"Armor Si":5.5, ...}}` when a res mix was logged on that day |
| `adjustments` | [str] | quick chips, e.g. `"pH Down"`, `"Chiller setpoint"`, `"LST tie"`, `"Res change"` |
| `notes` | string \| null | the user's free text |
| `photo_count` | int | only with the `photos` toggle. Number of photos saved for that day (photos live in this phone's IndexedDB only) |
| `photo_jpeg_b64` | string \| null | only with the `photos` toggle (off by default). Base64 JPEG (≤1024 px) of the **latest** photo that day; null if none |

Keys for toggles that are off are left out entirely (not set to null).

### `check_keys`
- `res`: the reservoir task (a full res change on `res_change` days, otherwise a top-off plus pH/EC reading)
- `a1`…`aN` (the legend in `check_keys` calls this `a1_aN`): that day's run-sheet actions in order (text in `targets_by_day[d].tasks`)
- `r_water`, `r_topoff`, `r_ph`, `r_ec`, `r_light`, `r_look`: daily check routine from Day 3 on (titles are given in `check_keys`)

### `score.status`
(Grading uses the day's **last** reading. A day counts as logged if it has a reading, a check, a note, or a save.)
- `ok`: logged, nothing off or close, and ≥60% of tasks done
- `warn`: at least one reading close (none off), or fewer than 60% of tasks done
- `bad`: at least one reading off
- `miss`: a past or current day with nothing logged
- `none`: a future day, or no gradeable data

### Grading margins (for `warn`)
pH ±0.15 · EC ±max(50, 10% of max) · water ±1 °F · air ±2 °F · RH ±5 % · VPD ±0.1 kPa · CO2 ±150 ppm · PPFD: ok within max(10, 4%), warn within max(30, 12%) · CO2 > 1500 ppm is always `bad`.

## Example (trimmed; numbers are illustrative)
```json
{"format":"99-growdata","schema_version":1,"exported_at":"2026-10-25T14:02:11.000Z","note":"AlmondGold run data for analysis",
 "selection":{"mode":"week","days":[8,9,10,11,12,13,14],"include":["readings","checks","mix","notes","adj","targets"]},
 "run_meta":{"app":"99","grow":"AlmondGold","plant":"Purple Kush Auto","type":"auto","system":"5.5 gal DWC, RO water","day1":"2026-10-14","res_change_days":[3,10,17,24,31,38,45,52,59,66],"co2":false,"leaf_offset_F":2},
 "units":{"ph":"pH","ec_uScm":"uS/cm","water_F":"F","air_F":"F","rh":"%","vpd":"kPa","co2":"ppm","ppfd":"umol/m2/s"},
 "targets_by_day":{"10":{"stage":"Early veg","ph":[5.6,6],"ec_uScm":[650,850],"water_F":[67,68],"air_F":[72,80],"rh":[55,70],"vpd":[0.8,1.2],"ppfd":250,"co2":null,"tasks":["Set light to PPFD 250 at the canopy top"]}},
 "days":[{"day":10,"week":2,"date":"2026-10-23","stage":"Early veg","res_change":true,"mix_week_in_res":2,
   "readings":[{"t":"19:30","ph":5.95,"ec_uScm":774,"water_F":null,"air_F":null,"rh":null,"vpd":null,"co2":null,"ppfd":250}],
   "grades":{"ph":"ok","ec_uScm":"ok","water_F":null,"air_F":null,"rh":null,"vpd":null,"ppfd":"ok","co2":null},
   "checks":{"done":["res"],"missed":["a1","r_water","r_topoff","r_ph","r_ec","r_light","r_look"]},
   "score":{"met":3,"close":0,"missed":0,"graded":3,"tasks_done":1,"tasks_total":8,"status":"ok"},
   "mix_ml":{"week":2,"gal_total":5.5,"ml":{"Armor Si":3,"CaliMagic":5.5,"FloraMicro":8,"FloraGro":8,"FloraBloom":3,"RapidStart":5.5,"Hydroguard":11}},
   "adjustments":["Res change"],"notes":"Week 2 res change done. Roots white."}]}
```

## Other formats
- **CSV** (UTF-8 with BOM, one row per reading; a day with no readings still gets one row). Columns: `day,date,week,stage,time,ph,ec_uScm,water_F,air_F,rh,vpd,co2,ppfd,ph_target,ec_target,water_target,air_target,rh_target,vpd_target,ppfd_target,score_met,score_graded,tasks_done,tasks_total,status,res_change,mix_week,adjustments,note`. Target ranges are written as `min-max`.
- **PDF**: header band, four charts (pH, EC, water, VPD; target band plus actual values), then a day table with readings colored by grade.
- **Plain text**: a human-readable day-by-day summary.
- **Copy as text**: copies the selected format to the clipboard (JSON for "Send to Grok Bot", CSV for CSV, and plain text for text or PDF).

File names: `99-almondgold-d<first>-<last>.csv|pdf|txt`.

Sharing uses the Android share sheet (Web Share API with files). If that isn't available, the file downloads instead.
