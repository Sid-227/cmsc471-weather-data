// Data calculations are independent of the charts so they can be checked directly.
export const DAY = 86400000;
export const START = Date.UTC(2017, 0, 1);
export const END = Date.UTC(2017, 8, 17);
export const STATIONS = [
  { name: 'BALTIMORE WASH INTL AP', state: 'MD', lat: '39.1667', lon: '-76.6833', label: 'Baltimore · BWI' },
  { name: 'CHICAGO OHARE INTL AP', state: 'IL', lat: '41.995', lon: '-87.9336', label: 'Chicago · O’Hare' },
  { name: 'DENVER INTL AP', state: 'CO', lat: '39.8328', lon: '-104.6575', label: 'Denver · International' },
  { name: 'MIAMI INTL AP', state: 'FL', lat: '25.7906', lon: '-80.3164', label: 'Miami · International' },
  { name: 'PHOENIX SKY HARBOR INTL AP', state: 'AZ', lat: '33.4278', lon: '-112.0039', label: 'Phoenix · Sky Harbor' },
  { name: 'SEATTLE TACOMA INTL AP', state: 'WA', lat: '47.4444', lon: '-122.3139', label: 'Seattle · Sea-Tac' }
];
export const stationKey = s => [s.name, s.state, s.lat, s.lon].join('|');
export const observed = row => row.high !== null && Number.isFinite(row.high);
export const isoDate = time => new Date(time).toISOString().slice(0, 10);
export const formatDate = time => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', timeZone: 'UTC'
}).format(time);
export const binIndex = value => Math.min(11, Math.floor(value / 10));
export const binLabel = index => `${index * 10} ≤ high ${index === 11 ? '≤' : '<'} ${(index + 1) * 10}°F`;

export function parseRecords(raw) {
  const keys = new Set(STATIONS.map(stationKey));
  const seen = new Set();
  const rows = raw.map(r => {
    if (!/^\d{8}$/.test(r.date)) throw new Error('Invalid date in the weather file.');
    const iso = `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6, 8)}`;
    const time = Date.parse(`${iso}T00:00:00Z`);
    const key = [r.station, r.state, r.latitude, r.longitude].join('|');
    const high = r.TMAX.trim() === '' ? null : Number(r.TMAX);
    const id = `${key}|${iso}`;
    if (!keys.has(key) || !Number.isFinite(time) || isoDate(time) !== iso || time < START || time > END
        || (high !== null && (!Number.isFinite(high) || high < 0 || high > 120)) || seen.has(id)) {
      throw new Error('Unexpected or duplicate observation in the weather file.');
    }
    seen.add(id);
    return { key, id, time, high };
  });
  if (rows.length !== 1560) throw new Error('The weather subset is incomplete.');
  for (const key of keys) {
    if (rows.filter(r => r.key === key).length !== 260) throw new Error('A station is missing date records.');
  }
  return rows.sort((a, b) => a.time - b.time);
}

export function summarize(rows, start, end) {
  const period = rows.filter(r => r.time >= start && r.time <= end);
  const valid = period.filter(observed);
  return {
    period, valid,
    days: Math.round((end - start) / DAY) + 1,
    count: valid.length,
    mean: valid.length ? valid.reduce((sum, r) => sum + r.high, 0) / valid.length : null,
    hot: valid.filter(r => r.high >= 90).length
  };
}

export function makeBins(rows, d3) {
  return d3.bin().value(r => r.high).domain([0, 120])
    .thresholds(d3.range(10, 120, 10))(rows.filter(observed));
}
