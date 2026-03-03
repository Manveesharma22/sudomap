import { Command } from 'commander';
import { NormalizationEngine } from './engine';
import { ANSIRenderer } from './renderer';
import { MockDataGenerator, CITY_SCENARIOS } from './mock';
import { ResourceCategory } from './types';

const program = new Command();

program
  .name('map-the-gap')
  .description('Sudo Map-The-Gap: A terminal-based civic equity visualizer')
  .version('1.0.0');

// ─── Visualize Command ──────────────────────────────────────────────
program
  .command('visualize')
  .description('Render a 16-bit resource map for a city')
  .option('-w, --width <number>', 'width of the map', '40')
  .option('-ht, --height <number>', 'height of the map', '20')
  .option('-c, --count <number>', 'number of data points', '100')
  .option('-b, --bias <string>', 'bias of the data (rich, poor, random)', 'random')
  .option('-s, --scenario <string>', 'preset city scenario (nyc, chicago, sf, detroit)')
  .option('--category <string>', 'filter by resource category')
  .option('--heatmap', 'render in heatmap mode')
  .action((options) => {
    const width = parseInt(options.width);
    const height = parseInt(options.height);
    const count = parseInt(options.count);
    const bias = options.bias as 'rich' | 'poor' | 'random';
    const heatmap = !!options.heatmap;
    const categoryFilter = options.category as ResourceCategory | undefined;

    let points;

    if (options.scenario) {
      const scenario = CITY_SCENARIOS.find(s => s.id === options.scenario);
      if (!scenario) {
        console.error(`\x1b[31mUnknown scenario: ${options.scenario}\x1b[0m`);
        console.log(`Available: ${CITY_SCENARIOS.map(s => s.id).join(', ')}`);
        process.exit(1);
      }
      console.log(`\x1b[38;5;49mLoading scenario: ${scenario.name} — ${scenario.description}\x1b[0m\n`);
      points = MockDataGenerator.generateScenario(scenario);
    } else {
      points = MockDataGenerator.generate(count, { lat: 40.7128, lng: -74.006 }, 0.05, bias);
    }

    const grid = NormalizationEngine.normalize(points, { width, height, categoryFilter });
    console.log(ANSIRenderer.render(grid, 0, heatmap));
  });

// ─── Diff Command ───────────────────────────────────────────────────
program
  .command('diff')
  .description('Compare planned vs actual services with animated disparity view')
  .option('-w, --width <number>', 'width of the map', '40')
  .option('-ht, --height <number>', 'height of the map', '20')
  .option('-s, --scenario <string>', 'preset city scenario (nyc, chicago, sf, detroit)')
  .option('-d, --disparity <number>', 'disparity level 0-1 (default: 0.3)', '0.3')
  .action((options) => {
    const width = parseInt(options.width);
    const height = parseInt(options.height);
    const disparity = parseFloat(options.disparity);

    let plannedPoints, actualPoints;

    if (options.scenario) {
      const scenario = CITY_SCENARIOS.find(s => s.id === options.scenario);
      if (!scenario) {
        console.error(`\x1b[31mUnknown scenario: ${options.scenario}\x1b[0m`);
        process.exit(1);
      }
      console.log(`\x1b[38;5;49mLoading scenario: ${scenario.name}\x1b[0m`);
      const data = MockDataGenerator.generatePlannedVsActual(scenario, disparity);
      plannedPoints = data.planned;
      actualPoints = data.actual;
    } else {
      plannedPoints = MockDataGenerator.generate(150, { lat: 40.7128, lng: -74.006 }, 0.05, 'rich');
      actualPoints = MockDataGenerator.generate(150, { lat: 40.7128, lng: -74.006 }, 0.05, 'poor');
    }

    const plannedGrid = NormalizationEngine.normalize(plannedPoints, { width, height });
    const actualGrid = NormalizationEngine.normalize(actualPoints, { width, height });

    const diffGrid = NormalizationEngine.diff(actualGrid, plannedGrid);

    let frame = 0;
    const interval = setInterval(() => {
      process.stdout.write(ANSIRenderer.render(diffGrid, frame++));
      if (frame > 20) {
        clearInterval(interval);
        console.log('\n\x1b[1;38;5;196m  ⚠  Diff animation complete. Disparities highlighted above.\x1b[0m\n');
      }
    }, 400);
  });

// ─── Analyze Command ────────────────────────────────────────────────
program
  .command('analyze')
  .description('Run equity analysis on a city scenario')
  .option('-s, --scenario <string>', 'preset city scenario (nyc, chicago, sf, detroit)', 'nyc')
  .option('-w, --width <number>', 'grid width for analysis', '40')
  .option('-ht, --height <number>', 'grid height for analysis', '20')
  .action((options) => {
    const width = parseInt(options.width);
    const height = parseInt(options.height);

    const scenario = CITY_SCENARIOS.find(s => s.id === options.scenario);
    if (!scenario) {
      console.error(`\x1b[31mUnknown scenario: ${options.scenario}\x1b[0m`);
      console.log(`Available: ${CITY_SCENARIOS.map(s => s.id).join(', ')}`);
      process.exit(1);
    }

    console.log(`\x1b[38;5;49mAnalyzing: ${scenario.name} — ${scenario.description}\x1b[0m\n`);

    const points = MockDataGenerator.generateScenario(scenario);
    const grid = NormalizationEngine.normalize(points, { width, height });
    const analysis = NormalizationEngine.analyze(grid, points);

    console.log(ANSIRenderer.renderAnalysis(analysis));
  });

// ─── Scenarios Command ──────────────────────────────────────────────
program
  .command('scenarios')
  .description('List all available city scenarios')
  .action(() => {
    console.log('\x1b[1;38;5;49m  Available City Scenarios:\x1b[0m\n');
    CITY_SCENARIOS.forEach(s => {
      console.log(`  \x1b[1m${s.id.padEnd(10)}\x1b[0m \x1b[38;5;255m${s.name}\x1b[0m`);
      console.log(`  ${''.padEnd(10)} \x1b[38;5;240m${s.description}\x1b[0m`);
      console.log(`  ${''.padEnd(10)} \x1b[38;5;237m${s.clusters.length} resource clusters\x1b[0m\n`);
    });
  });

program.parse();
