import { START, END, STATIONS, stationKey, isoDate, formatDate, binIndex, binLabel, parseRecords, summarize, makeBins } from './model.js';
import { createTimeline } from './timeline.js';
import { createHistogram } from './histogram.js';

const $ = id => document.getElementById(id);
const state = { station: stationKey(STATIONS[0]), start: START, end: END, bin: null };
const defaultDetail = 'Hover a day or bar for details, or use keyboard focus.';
let stationData, timeline, histogram, maxCount, summary;

function hideTooltip() { $('tooltip').hidden = true; }
function clearDetails() {
  hideTooltip();
  $('details').textContent = defaultDetail;
  histogram?.highlight(null);
}
function showDetail(text, event) {
  $('details').textContent = text.replaceAll('\n', ' · ');
  if (!event || event.pointerType === 'touch') { hideTooltip(); return; }
  const tooltip = $('tooltip');
  tooltip.textContent = text;
  tooltip.hidden = false;
  const box = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(event.clientX + 16, window.innerWidth - box.width - 8))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(event.clientY + 16, window.innerHeight - box.height - 8))}px`;
}

function render() {
  const rows = stationData.get(state.station);
  const station = STATIONS.find(s => stationKey(s) === state.station);
  summary = summarize(rows, state.start, state.end);
  const bins = makeBins(summary.valid, window.d3);
  const selected = state.bin === null ? [] : bins[state.bin];
  $('station-title').textContent = station.label;
  $('station-name').textContent = `${station.name} · ${station.state}`;
  $('range-label').textContent = `${formatDate(state.start)} – ${formatDate(state.end)}, 2017`;
  $('coverage').textContent = `${summary.count} of ${summary.days} days observed${summary.days > summary.count ? ` · ${summary.days - summary.count} missing` : ' · complete coverage'}`;
  $('period-badge').textContent = `${summary.count} observed ${summary.count === 1 ? 'day' : 'days'}`;
  $('start-date').value = isoDate(state.start);
  $('end-date').value = isoDate(state.end);
  $('station').value = state.station;
  $('mean-value').textContent = summary.mean === null ? 'N/A' : `${summary.mean.toFixed(1)}°F`;
  $('hot-value').replaceChildren(document.createTextNode(summary.count ? `${summary.hot}` : 'N/A'));
  const hotDenominator = document.createElement('small');
  hotDenominator.textContent = summary.count ? ` / ${summary.count} observed days` : ' no observations';
  $('hot-value').append(hotDenominator);
  $('count-value').replaceChildren(document.createTextNode(`${summary.count}`));
  const coverageDenominator = document.createElement('small');
  coverageDenominator.textContent = ` / ${summary.days} calendar days`;
  $('count-value').append(coverageDenominator);
  $('empty-state').hidden = summary.count > 0;
  $('clear-selection').disabled = state.bin === null;
  $('selection-label').textContent = state.bin === null ? 'Select a bar to connect temperatures with dates.'
    : `${binLabel(state.bin)} · ${selected.length} matching ${selected.length === 1 ? 'day' : 'days'} highlighted above.`;
  timeline.render(rows, state, selected);
  histogram.render(bins, state.bin, summary.count, maxCount);
}

function updateRange(start, end) {
  state.start = start;
  state.end = end;
  state.bin = null;
  $('date-error').hidden = true;
  $('start-date').removeAttribute('aria-invalid');
  $('end-date').removeAttribute('aria-invalid');
  clearDetails();
  render();
}

function datesChanged() {
  const start = Date.parse(`${$('start-date').value}T00:00:00Z`);
  const end = Date.parse(`${$('end-date').value}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < START || end > END || start > end) {
    $('date-error').textContent = 'Choose dates from Jan 1 to Sep 17, 2017, with the start on or before the end. Charts still show the last valid range.';
    $('date-error').hidden = false;
    $('start-date').setAttribute('aria-invalid', 'true');
    $('end-date').setAttribute('aria-invalid', 'true');
    return;
  }
  updateRange(start, end);
}

async function init() {
  try {
    // Both loading modes are explicit: the library is a pinned CDN script,
    // while the CSV is a small static file served with this page.
    if (!window.d3) throw new Error('D3 could not load. Check your internet connection and reload the page.');
    const raw = await window.d3.csv('data/weather-subset.csv');
    const rows = parseRecords(raw);
    stationData = window.d3.group(rows, r => r.key);
    const peak = window.d3.max([...stationData.values()], stationRows => window.d3.max(makeBins(stationRows, window.d3), b => b.length));
    maxCount = Math.ceil(peak / 10) * 10;
    for (const station of STATIONS) {
      const option = document.createElement('option');
      option.value = stationKey(station);
      option.textContent = station.label;
      $('station').append(option);
    }
    histogram = createHistogram($('histogram'), {
      onSelect(index) {
        state.bin = state.bin === index ? null : index;
        clearDetails();
        render();
      },
      onInspect(bin, count, event) {
        if (!bin) { clearDetails(); return; }
        const fraction = count ? `${(100 * bin.length / count).toFixed(1)}% of ${count} observed days` : 'No observed days in this period';
        showDetail(`${binLabel(bin.x0 / 10)}\n${bin.length} ${bin.length === 1 ? 'day' : 'days'} · ${fraction}`, event);
      }
    });
    timeline = createTimeline($('timeline'), {
      onRange: updateRange,
      onInspect(row, event) {
        if (!row) { clearDetails(); return; }
        const within = row.time >= state.start && row.time <= state.end;
        const station = STATIONS.find(s => stationKey(s) === state.station);
        const value = row.high === null ? 'Daily high: not reported' : `Daily high: ${row.high.toFixed(1)}°F`;
        showDetail(`${formatDate(row.time)}, 2017 · ${station.label}\n${value}${within ? '' : '\nOutside selected date range'}`, event);
        histogram.highlight(within && row.high !== null ? binIndex(row.high) : null);
      }
    });
    $('controls').addEventListener('submit', event => event.preventDefault());
    $('station').addEventListener('change', event => {
      state.station = event.target.value;
      updateRange(state.start, state.end);
    });
    $('start-date').addEventListener('change', datesChanged);
    $('end-date').addEventListener('change', datesChanged);
    $('reset').addEventListener('click', () => {
      state.station = stationKey(STATIONS[0]);
      updateRange(START, END);
    });
    $('clear-selection').addEventListener('click', () => {
      state.bin = null;
      clearDetails();
      render();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        state.bin = null;
        clearDetails();
        render();
      }
    });
    window.addEventListener('scroll', hideTooltip, { passive: true });
    $('app').hidden = false;
    $('load-status').hidden = true;
    render();
    let previousWidth = $('timeline').clientWidth;
    new ResizeObserver(() => {
      const nextWidth = $('timeline').clientWidth;
      if (nextWidth !== previousWidth) {
        previousWidth = nextWidth;
        clearDetails();
        render();
      }
    }).observe($('timeline'));
  } catch (error) {
    $('app').hidden = true;
    $('load-status').hidden = false;
    $('load-status').classList.add('error-message');
    $('load-status').textContent = `Unable to load the explorer. ${error.message} Serve this folder over HTTP (see README), then reload.`;
    console.error(error);
  }
}

// Wait for the CDN script to finish (or fail) before checking D3.
if (document.readyState === 'complete') init();
else window.addEventListener('load', init, { once: true });
