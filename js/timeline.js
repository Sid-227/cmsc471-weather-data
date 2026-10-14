import { DAY, START, END, observed, formatDate } from './model.js';

export function createTimeline(container, { onRange, onInspect }) {
  const d3 = window.d3;
  const margin = { top: 28, right: 20, bottom: 38, left: 46 };
  const svg = d3.select(container).append('svg').attr('tabindex', 0)
    .attr('role', 'group').attr('aria-label', 'Daily high timeline. Drag to select dates. Use left and right arrow keys to inspect days.')
    .attr('aria-describedby', 'timeline-help');
  svg.append('title').text('Daily high temperature, January 1–September 17, 2017');
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const grid = plot.append('g').attr('class', 'grid');
  const xAxis = plot.append('g').attr('class', 'axis');
  const yAxis = plot.append('g').attr('class', 'axis');
  plot.append('text').attr('class', 'unit-label').attr('x', 0).attr('y', -12).text('DAILY HIGH · °F');
  const reference = plot.append('line').attr('class', 'threshold-line');
  const referenceLabel = plot.append('text').attr('class', 'threshold-label').text('90°F');
  const contextLine = plot.append('path').attr('class', 'context-line');
  const activeLine = plot.append('path').attr('class', 'temperature-line');
  const highlights = plot.append('g').attr('class', 'linked-days').attr('pointer-events', 'none');
  const brushGroup = plot.append('g').attr('class', 'brush');
  const cursor = plot.append('g').attr('class', 'day-cursor').attr('pointer-events', 'none').style('display', 'none');
  cursor.append('line');
  cursor.append('circle').attr('r', 5);
  let x, y, width, height, rows = [], state, syncing = false, dragging = false, inspected = START;
  const brush = d3.brushX().handleSize(12)
    .on('start', event => {
      if (syncing || !event.sourceEvent) return;
      dragging = true;
      hideCursor();
      onInspect(null);
    })
    .on('brush end', event => {
      if (syncing || !event.sourceEvent) return;
      const snap = pixel => Math.max(START, Math.min(END, START + Math.round((+x.invert(pixel) - START) / DAY) * DAY));
      const range = event.selection ? event.selection.map(snap) : [START, END];
      onRange(range[0], range[1]);
      if (event.type === 'end') {
        dragging = false;
        syncBrush();
      }
    });

  function syncBrush() {
    if (!state || dragging) return;
    syncing = true;
    const full = state.start === START && state.end === END;
    let pixels = [x(state.start), x(state.end)];
    // A one-day selection still needs a visible, usable brush handle.
    if (state.start === state.end) pixels = [Math.max(0, pixels[0] - 2), Math.min(width, pixels[1] + 2)];
    brushGroup.call(brush.move, full ? null : pixels);
    syncing = false;
  }

  function hideCursor() { cursor.style('display', 'none'); }

  function inspect(time, event) {
    inspected = time;
    const row = rows.find(r => r.time === time);
    if (!row) return;
    cursor.style('display', null);
    cursor.select('line').attr('x1', x(time)).attr('x2', x(time)).attr('y1', 0).attr('y2', height);
    cursor.select('circle').style('display', observed(row) ? null : 'none').attr('cx', x(time))
      .attr('cy', observed(row) ? y(row.high) : 0);
    onInspect(row, event);
  }

  brushGroup.on('pointermove.inspect', event => {
    if (dragging || !x) return;
    const [pixel] = d3.pointer(event, plot.node());
    const time = Math.max(START, Math.min(END, START + Math.round((+x.invert(pixel) - START) / DAY) * DAY));
    inspect(time, event);
  }).on('pointerleave.inspect', () => { hideCursor(); onInspect(null); });

  svg.on('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') { hideCursor(); onInspect(null); return; }
    inspected = event.key === 'Home' ? START : event.key === 'End' ? END
      : Math.max(START, Math.min(END, inspected + (event.key === 'ArrowRight' ? DAY : -DAY)));
    inspect(inspected);
  }).on('focus', () => inspect(inspected)).on('blur', () => { hideCursor(); onInspect(null); });

  function render(stationRows, nextState, selectedRows) {
    rows = stationRows;
    state = nextState;
    const outerWidth = Math.max(280, container.clientWidth);
    height = outerWidth < 550 ? 210 : 245;
    width = outerWidth - margin.left - margin.right;
    svg.attr('viewBox', `0 0 ${outerWidth} ${height + margin.top + margin.bottom}`);
    x = d3.scaleUtc().domain([START, END]).range([0, width]);
    y = d3.scaleLinear().domain([0, 120]).range([height, 0]);
    grid.call(d3.axisLeft(y).tickValues([0, 30, 60, 90, 120]).tickSize(-width).tickFormat(''));
    yAxis.call(d3.axisLeft(y).tickValues([0, 30, 60, 90, 120]).tickSize(0).tickPadding(10));
    xAxis.attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)
      .ticks(d3.utcMonth.every(outerWidth < 550 ? 2 : 1)).tickFormat(d3.utcFormat('%b')).tickSize(0).tickPadding(14));
    reference.attr('x1', 0).attr('x2', width).attr('y1', y(90)).attr('y2', y(90));
    referenceLabel.attr('x', width).attr('y', y(90) - 7).attr('text-anchor', 'end');
    const line = d3.line().x(r => x(r.time)).y(r => y(r.high));
    contextLine.attr('d', line.defined(observed)(rows));
    activeLine.attr('d', line.defined(r => observed(r) && r.time >= state.start && r.time <= state.end)(rows));
    highlights.selectAll('circle').data(selectedRows, r => r.id).join('circle')
      .attr('cx', r => x(r.time)).attr('cy', r => y(r.high)).attr('r', 4);
    brush.extent([[0, 0], [width, height]]);
    brushGroup.call(brush);
    syncBrush();
    hideCursor();
    svg.select('title').text(`Daily high temperature, ${formatDate(START)}–${formatDate(END)}, 2017`);
  }

  return { render, hideCursor };
}
