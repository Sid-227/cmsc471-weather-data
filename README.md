# Weather Explorer

A static CMSC471 Assignment 1 visualization: daily-high timeline + linked temperature histogram. Vanilla HTML, CSS, JavaScript, and D3 v7.9.0. No installation, framework, build step, or backend.

## Run locally

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. VS Code Live Server is also suitable. Use HTTP, not a `file://` URL: JavaScript modules and CSV loading need a web server. Internet access is required to load D3 from the CDN, following the approach in the labs. Stop the local server with Ctrl+C when done.

## Explore

- Choose one of six airport stations.
- Drag across the timeline to select dates, or use the From/To inputs. Move/resize the brush to change the interval. The histogram updates immediately.
- Select a nonempty histogram bar to outline its member days on the timeline. Select it again or use Clear selection to deselect.
- Hover a day/bar for details. Focus the timeline and use Left/Right/Home/End to inspect days; tab to histogram bars and use Enter/Space to select. Escape clears selection.
- Changing the station preserves the interval. Changing station or dates clears the selected bin. Reset all restores Baltimore and the full period.

## Data and reproducibility

Source: course-provided `References/Weather Data/weather.csv` and `weather.txt`, attributed by the assignment to NOAA GHCN-Daily. The supplied CSV uses Fahrenheit; no temperature conversion is applied.

`data/weather-subset.csv` contains six exact airport station/location keys, Jan 1–Sep 17, 2017: 1,560 rows and 1,559 valid TMAX readings. Miami September 10 is blank. Each station has 260 date records. The full source covers Jan 1–Sep 21 and includes Canadian stations/US territories; the subset is explicitly six US airports, not a national sample. Some full-file temperatures are suspicious; the selected stations were audited and span 5.18–118.94°F.

In the original local workspace, regenerate the subset with Python's standard library (the preparation script and full reference data are intentionally excluded from the website repository):

```sh
python3 scripts/prepare-data.py
```

The script matches station name/state/coordinates, filters the date window, keeps original values and blanks, sorts station/date records, and checks counts and uniqueness. It does not change the original CSV. A Python preparation script replaces the initially proposed `.mjs` helper because Python is available locally and its standard CSV parser needs no dependencies. The website itself remains entirely HTML/CSS/JavaScript.

Dates are parsed/displayed consistently in UTC. Date filters include both endpoints. Histogram bins are `[0,10), [10,20), …, [110,120]` °F. Nulls never become zero. Mean and 90°F-day counts use unrounded observed highs. Percentages divide by the number of valid observations, not calendar days. Both chart temperature scales and the histogram count maximum stay fixed across selections.

## Checks

In the original local workspace, open **http://127.0.0.1:8000/tests/** to run the data checks without installing a test framework. The tests stay local and are excluded from the website repository. They exercise the actual parsing, summary, and D3 binning functions, including missing-only intervals, bin boundaries, inclusive endpoints, duplicate rejection, and linked-member counts.

Verified during implementation: **240 data checks passed** against D3 7.9.0; all four application modules parsed successfully; local asset links and element IDs resolved; the local server returned HTTP 200. These checks do not replace the manual browser checks below.

Independent expected summer results (June 1–August 31, 92 observations each):

| Station | Days with daily high ≥90°F |
| --- | ---: |
| Baltimore | 21 |
| Chicago | 6 |
| Denver | 34 |
| Miami | 65 |
| Phoenix | 91 |
| Seattle | 5 |

Manual browser checklist before submission:

- [ ] Brush, move/resize/clear the interval; verify dates and histogram update together.
- [ ] Select a populated bar; compare its count with highlighted days. Deselect and Reset all.
- [ ] Set June 1–August 31, switch Phoenix/Seattle, and verify the table above.
- [ ] Set Miami September 10 only: no reported temperature, zero histogram counts, N/A mean/hot-day statistic, and 0/1 coverage.
- [ ] Try invalid/reversed dates: the last valid chart stays visible and an error explains why.
- [ ] Keyboard inspect days/select bins; test the date inputs and focus indicators.
- [ ] Test narrow/mobile width and at least two browsers; inspect labels, tooltip placement, brush, and console errors.
- [ ] Confirm helpful load errors with an unavailable CSV/CDN, then restore normal loading.
- [ ] Verify the deployed URL and CSV in a signed-out window.

Browser/visual QA could not be performed in the assistant session because computer-use access to Chrome was denied. Data checks and source checks are separate from this outstanding manual verification.

## Files

- `index.html`: interface and the required on-page write-up.
- `css/styles.css`: responsive layout, chart styling, focus states.
- `js/main.js`: load data, own state, connect controls and chart callbacks.
- `js/model.js`: parsing, station definitions, date/statistics/bin helpers.
- `js/timeline.js`, `js/histogram.js`: D3 views and interactions.
- `data/weather-subset.csv`: static input.
- `data/weather.txt`: supplied measurement-unit documentation, linked from the webpage.
- Local only: `scripts/prepare-data.py` for data preparation and `tests/` for browser-run data checks.

## Before publishing/submitting

The on-page development section intentionally contains placeholders. Replace them with **both names, actual contributions and people-hours, and your own reflections/feedback**. Review the code and verify results; update the AI disclosure honestly. Register the team in Canvas A1 groups.

This folder is ready for static hosting such as GitHub Pages. The `.gitignore` includes only `index.html`, `css/`, `js/`, `data/`, `README.md`, and `.gitignore`. All of `References/` (including labs, lectures, and the full dataset), `assignment.md`, `PLAN.md`, `scripts/`, and `tests/` stay local. A copy of the supplied variable documentation is in `data/weather.txt` so the webpage has no dependency on `References/`.

For GitHub Pages, use Settings → Pages → Deploy from a branch → `main` → `/ (root)`. The README supports running and understanding the website but is not required by the webpage itself.

Demo outline (2–3 minutes): question/data → brush dates → select a bin and inspect details → compare Phoenix/Seattle in summer → demonstrate Miami's missing day and reset → point out write-up/sources. Record the final deployed version and submit its URL and video to Canvas-ELMS.

## References

The webpage cites the supplied dataset/documentation, course Labs 0–5 and Lectures 1–5, and official [D3 brush](https://d3js.org/d3-brush), [histogram](https://d3js.org/d3-array/bin), and [line](https://d3js.org/d3-shape/line) documentation. [NOAA's GHCN-Daily readme](https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt) describes the underlying data format; the course-provided file is transformed and its local unit documentation applies.
