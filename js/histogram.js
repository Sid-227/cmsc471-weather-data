import { binLabel } from './model.js';

export function createHistogram(container, { onSelect, onInspect }) {
  const d3 = window.d3;
  const margin = { top: 28, right: 20, bottom: 48, left: 46 };
  const svg = d3.select(container).append('svg').attr('role', 'group')
    .attr('aria-label', 'Temperature distribution. Focus a bar and press Enter or Space to select its days.');
  svg.append('title').text('Number of observed days in each 10-degree temperature interval');
  const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const grid = plot.append('g').attr('class', 'grid');
  const xAxis = plot.append('g').attr('class', 'axis');
  const yAxis = plot.append('g').attr('class', 'axis');
  plot.append('text').attr('class', 'unit-label').attr('x', 0).attr('y', -12).text('OBSERVED DAYS');
  const xLabel = plot.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle').text('Daily high temperature (°F)');
  const bars = plot.append('g');
  const counts = plot.append('g').attr('aria-hidden', 'true');
  let selected = null;

  function render(bins, selectedBin, count, maxCount) {
    selected = selectedBin;
    const outerWidth = Math.max(280, container.clientWidth);
    const width = outerWidth - margin.left - margin.right;
    const height = outerWidth < 550 ? 185 : 205;
    svg.attr('viewBox', `0 0 ${outerWidth} ${height + margin.top + margin.bottom}`);
    const x = d3.scaleLinear().domain([0, 120]).range([0, width]);
    const y = d3.scaleLinear().domain([0, maxCount]).range([height, 0]);
    const ticks = y.ticks(4).filter(Number.isInteger);
    grid.call(d3.axisLeft(y).tickValues(ticks).tickSize(-width).tickFormat(''));
    yAxis.call(d3.axisLeft(y).tickValues(ticks).tickSize(0).tickPadding(10));
    xAxis.attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)
      .tickValues(d3.range(0, 121, outerWidth < 550 ? 20 : 10)).tickSize(0).tickPadding(12));
    xLabel.attr('x', width / 2).attr('y', height + 42);
    bars.selectAll('rect').data(bins, b => b.x0).join('rect')
      .attr('class', (b, i) => `histogram-bar${selected === i ? ' selected' : ''}${b.length ? '' : ' empty'}`)
      .attr('x', b => x(b.x0) + 1).attr('width', b => Math.max(1, x(b.x1) - x(b.x0) - 2))
      .attr('y', b => y(b.length)).attr('height', b => Math.max(2, height - y(b.length)))
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-disabled', b => b.length === 0 ? 'true' : null)
      .attr('aria-pressed', (b, i) => String(selected === i))
      .attr('aria-label', (b, i) => `${binLabel(i)}: ${b.length} days, ${count ? (100 * b.length / count).toFixed(1) : '0'} percent. ${selected === i ? 'Selected.' : 'Select to highlight matching dates.'}`)
      .on('click', (event, b) => { if (b.length) onSelect(b.x0 / 10); })
      .on('keydown', (event, b) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (b.length) onSelect(b.x0 / 10);
        }
      })
      .on('pointermove', (event, b) => onInspect(b, count, event))
      .on('pointerleave', () => onInspect(null))
      .on('focus', (event, b) => onInspect(b, count))
      .on('blur', () => onInspect(null));
    counts.selectAll('text').data(bins, b => b.x0).join('text').attr('class', 'bar-count')
      .attr('x', b => (x(b.x0) + x(b.x1)) / 2).attr('y', b => y(b.length) - 7)
      .attr('text-anchor', 'middle').text(b => b.length || '');
  }

  function highlight(index) {
    bars.selectAll('rect').classed('inspected', (b, i) => i === index);
  }
  return { render, highlight };
}
