import { MapGrid, RESOURCE_CATEGORIES, ResourceCategory } from './types';

/**
 * 16-bit ANSI Renderer
 * Maps resource density scores to RPG-style tiles with ANSI 256-color palette.
 */
export class ANSIRenderer {
  // ─── Extended ANSI 256 Color Palette ────────────────────────────────
  private static PALETTE = {
    // Lush / High Resource
    DEEP_FOREST: 22,
    FOREST: 28,
    GRASS: 34,
    LIGHT_GRASS: 112,
    MEADOW: 120,

    // Medium / Settled
    BUILDING: 254,
    TOWN: 180,
    ROAD: 245,

    // Barren / Low Resource
    SAND: 222,
    DRY: 172,
    CRACKED: 130,

    // Empty / Desert
    VOID: 234,
    ABYSS: 232,

    // Diff Severity
    DIFF_MINOR: 220,  // Yellow
    DIFF_MODERATE: 208, // Orange
    DIFF_CRITICAL: 196, // Red
    DIFF_FLASH: 198,  // Pink

    // Category Colors
    TRANSIT: 75,
    FOOD: 208,
    PARKS: 34,
    HEALTHCARE: 196,
    EDUCATION: 220,
    HOUSING: 141,

    // UI Chrome
    BORDER: 240,
    HEADER: 48,
    DIM: 237,
    ACCENT: 49,
  };

  // ─── Expanded Tile Library ──────────────────────────────────────────
  private static TILES: Record<string, string[]> = {
    PRISTINE: ['🏛️', '🏢', '✨'],
    LUSH: ['🌲', '🌳', '🌿'],
    SETTLED: ['🏠', '🏡', '🏘️'],
    GROWING: ['🌱', '🍀', '🌾'],
    SPARSE: ['░░', '▒▒', '▓▓'],
    BARREN: ['⬛', '◌◌', '··'],
    WARNING: ['⚠️', '🔥', '❌'],
    CATEGORY: {
      transit: '🚌',
      food: '🍎',
      parks: '🌲',
      healthcare: '🏥',
      education: '📚',
      housing: '🏠',
    } as any,
  };

  // ─── Heatmap Color Ramp (ANSI 256) ─────────────────────────────────
  private static HEATMAP_RAMP = [
    232, 233, 234, 235, 236,  // Black → Dark grey
    52, 88, 124, 160, 196,  // Dark red → Bright red
    202, 208, 214, 220, 226,  // Orange → Yellow
    190, 154, 118, 82, 46,   // Yellow-green → Green
    47, 48, 49, 50, 51,   // Green → Cyan
  ];

  /**
   * Render a full frame of the map with optional heatmap mode.
   */
  static render(grid: MapGrid, frame: number = 0, heatmap: boolean = false): string {
    let output = '';

    // Clear screen & cursor home
    output += '\x1b[2J\x1b[H';

    // ── Header ──
    output += this.renderHeader(grid, frame);

    // ── Top border ──
    const borderWidth = Math.max(0, (grid.width || 0) * 2 + 2);
    output += `\x1b[38;5;${this.PALETTE.BORDER}m  ╔${'═'.repeat(borderWidth)}╗\x1b[0m\n`;

    // ── Map body ──
    for (let y = 0; y < grid.height; y++) {
      output += `\x1b[38;5;${this.PALETTE.BORDER}m  ║ \x1b[0m`;

      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        const score = cell.score;

        if (heatmap) {
          output += this.renderHeatmapCell(score);
        } else if (cell.isDiff) {
          output += this.renderDiffCell(cell.diffSeverity!, frame);
        } else {
          output += this.renderTerrainCell(score, cell.dominantCategory, frame, x, y);
        }
      }

      output += `\x1b[38;5;${this.PALETTE.BORDER}m ║\x1b[0m\n`;
    }

    // ── Bottom border ──
    output += `\x1b[38;5;${this.PALETTE.BORDER}m  ╚${'═'.repeat(grid.width * 2 + 2)}╝\x1b[0m\n`;

    // ── Legend & Stats ──
    output += this.renderLegend(grid);

    return output;
  }

  /**
   * Render the header bar.
   */
  private static renderHeader(grid: MapGrid, frame: number): string {
    let h = '';
    h += `\x1b[1;38;5;${this.PALETTE.HEADER}m  ╭─── SUDO MAP-THE-GAP ───────────────────────────╮\x1b[0m\n`;
    h += `\x1b[38;5;${this.PALETTE.HEADER}m  │\x1b[0m \x1b[1mCivic Equity Visualizer\x1b[0m`;
    const gridWidth = grid.width || 0;
    const gridHeight = grid.height || 0;
    h += `\x1b[38;5;${this.PALETTE.DIM}m  Grid: ${gridWidth}×${gridHeight}  Frame: ${frame}\x1b[0m`;
    const progressLabel = `  Grid: ${gridWidth}×${gridHeight}  Frame: ${frame}`;
    const pad = 50 - 28 - progressLabel.length;
    h += ' '.repeat(Math.max(0, pad));
    h += `\x1b[38;5;${this.PALETTE.HEADER}m│\x1b[0m\n`;
    h += `\x1b[38;5;${this.PALETTE.HEADER}m  ╰─────────────────────────────────────────────────╯\x1b[0m\n\n`;
    return h;
  }

  /**
   * Render a single terrain cell based on resource score.
   */
  private static renderTerrainCell(
    score: number,
    category: ResourceCategory | undefined,
    frame: number,
    x: number,
    y: number,
  ): string {
    let char = '';
    let color = 0;

    // Sparkle effect for high-resource cells
    const sparkle = (x + y + frame) % 7 === 0;

    if (score > 0.9) {
      char = sparkle ? '✨' : '🏛️';
      color = this.PALETTE.BUILDING;
    } else if (score > 0.75) {
      char = sparkle ? '🌟' : '🏢';
      color = this.PALETTE.TOWN;
    } else if (score > 0.6) {
      char = category ? (this.TILES.CATEGORY as any)[category] || '🏠' : '🏠';
      color = this.getCategoryColor(category);
    } else if (score > 0.45) {
      char = '🌲';
      color = this.PALETTE.FOREST;
    } else if (score > 0.3) {
      char = '🌿';
      color = this.PALETTE.GRASS;
    } else if (score > 0.15) {
      char = '░░';
      color = this.PALETTE.SAND;
    } else if (score > 0.05) {
      char = '▒▒';
      color = this.PALETTE.CRACKED;
    } else {
      char = '⬛';
      color = this.PALETTE.VOID;
    }

    // Pad single-char emojis
    if (char.length === 1) char = char + ' ';

    return `\x1b[38;5;${color}m${char}\x1b[0m`;
  }

  /**
   * Render a diff cell with flashing severity.
   */
  private static renderDiffCell(severity: 'minor' | 'moderate' | 'critical', frame: number): string {
    const flash = frame % 2 === 0;

    switch (severity) {
      case 'critical':
        return flash
          ? `\x1b[1;38;5;${this.PALETTE.DIFF_CRITICAL}m⚠️ \x1b[0m`
          : `\x1b[38;5;${this.PALETTE.DIFF_FLASH}m❌\x1b[0m`;
      case 'moderate':
        return flash
          ? `\x1b[38;5;${this.PALETTE.DIFF_MODERATE}m▓▓\x1b[0m`
          : `\x1b[38;5;${this.PALETTE.DIFF_MINOR}m░░\x1b[0m`;
      case 'minor':
        return flash
          ? `\x1b[38;5;${this.PALETTE.DIFF_MINOR}m·· \x1b[0m`
          : `\x1b[38;5;${this.PALETTE.DIM}m  \x1b[0m`;
      default:
        return '  ';
    }
  }

  /**
   * Render a heatmap cell with continuous color gradient.
   */
  private static renderHeatmapCell(score: number): string {
    const idx = Math.min(
      this.HEATMAP_RAMP.length - 1,
      Math.floor(score * (this.HEATMAP_RAMP.length - 1))
    );
    const color = this.HEATMAP_RAMP[idx];
    return `\x1b[48;5;${color}m  \x1b[0m`;
  }

  /**
   * Get ANSI color for a resource category.
   */
  private static getCategoryColor(category?: ResourceCategory): number {
    if (!category) return this.PALETTE.GRASS;
    const cat = RESOURCE_CATEGORIES.find(c => c.key === category);
    return cat?.color ?? this.PALETTE.GRASS;
  }

  /**
   * Render legend and basic stats.
   */
  private static renderLegend(grid: MapGrid): string {
    let l = '\n';
    l += `\x1b[2m  ┌─── LEGEND ─────────────────────────────────────┐\x1b[0m\n`;
    l += `\x1b[2m  │\x1b[0m 🏛️ Pristine  🏢 High   🏠 Settled  🌲 Medium  \x1b[2m│\x1b[0m\n`;
    l += `\x1b[2m  │\x1b[0m 🌿 Growing   ░░ Sparse  ▒▒ Barren   ⬛ Desert  \x1b[2m│\x1b[0m\n`;
    l += `\x1b[2m  │\x1b[0m \x1b[38;5;${this.PALETTE.DIFF_CRITICAL}m⚠️ Critical\x1b[0m  \x1b[38;5;${this.PALETTE.DIFF_MODERATE}m▓▓ Moderate\x1b[0m  \x1b[38;5;${this.PALETTE.DIFF_MINOR}m·· Minor\x1b[0m     \x1b[2m│\x1b[0m\n`;
    l += `\x1b[2m  └───────────────────────────────────────────────────┘\x1b[0m\n`;

    // Quick stats
    let totalScore = 0;
    let cellCount = 0;
    let deserts = 0;
    let diffs = 0;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        totalScore += grid.cells[y][x].score;
        cellCount++;
        if (grid.cells[y][x].score < 0.1) deserts++;
        if (grid.cells[y][x].isDiff) diffs++;
      }
    }

    const avg = (totalScore / cellCount).toFixed(2);
    l += `\n\x1b[38;5;${this.PALETTE.DIM}m  Stats: `;
    l += `Avg Score: \x1b[1;38;5;${this.PALETTE.ACCENT}m${avg}\x1b[0;38;5;${this.PALETTE.DIM}m | `;
    l += `Deserts: \x1b[1;38;5;${this.PALETTE.DIFF_CRITICAL}m${deserts}\x1b[0;38;5;${this.PALETTE.DIM}m | `;
    if (diffs > 0) l += `Disparities: \x1b[1;38;5;${this.PALETTE.DIFF_MODERATE}m${diffs}\x1b[0;38;5;${this.PALETTE.DIM}m | `;
    l += `Cells: ${cellCount}\x1b[0m\n`;

    return l;
  }

  /**
   * Render a compact analysis summary for CLI output.
   */
  static renderAnalysis(analysis: any): string {
    let out = '';
    out += '\x1b[2J\x1b[H';
    out += `\x1b[1;38;5;${this.PALETTE.HEADER}m  ╭─── EQUITY ANALYSIS ────────────────────────────╮\x1b[0m\n`;
    out += `\x1b[38;5;${this.PALETTE.HEADER}m  │\x1b[0m \x1b[1mSudo Map-The-Gap — Civic Metrics Report\x1b[0m`;
    out += ' '.repeat(9);
    out += `\x1b[38;5;${this.PALETTE.HEADER}m│\x1b[0m\n`;
    out += `\x1b[38;5;${this.PALETTE.HEADER}m  ╰─────────────────────────────────────────────────╯\x1b[0m\n\n`;

    // Key metrics
    const eqColor = analysis.equityIndex > 60 ? this.PALETTE.ACCENT : analysis.equityIndex > 30 ? this.PALETTE.DIFF_MODERATE : this.PALETTE.DIFF_CRITICAL;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m┌──────────────────┬──────────────┐\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Equity Index     \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m \x1b[1;38;5;${eqColor}m${analysis.equityIndex}/100\x1b[0m       \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Coverage         \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m ${analysis.coveragePercent}%        \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Avg Score        \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m ${analysis.averageScore}       \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Critical Deserts \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m \x1b[38;5;${this.PALETTE.DIFF_CRITICAL}m${analysis.criticalDeserts}\x1b[0m            \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Disparity Score  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m ${analysis.disparityScore}/100     \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m Total Resources  \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m ${analysis.totalPoints}          \x1b[38;5;${this.PALETTE.DIM}m│\x1b[0m\n`;
    out += `  \x1b[38;5;${this.PALETTE.DIM}m└──────────────────┴──────────────┘\x1b[0m\n\n`;

    // Category breakdown
    if (analysis.categoryBreakdown?.length > 0) {
      out += `  \x1b[1mCategory Breakdown:\x1b[0m\n`;
      for (const cat of analysis.categoryBreakdown) {
        const info = RESOURCE_CATEGORIES.find(c => c.key === cat.category);
        const bar = '█'.repeat(Math.round(cat.avgScore * 20));
        const empty = '░'.repeat(20 - Math.round(cat.avgScore * 20));
        out += `  \x1b[38;5;${info?.color || 255}m${info?.emoji || '•'} ${(info?.label || cat.category).padEnd(20)}\x1b[0m `;
        out += `\x1b[38;5;${info?.color || 255}m${bar}\x1b[38;5;${this.PALETTE.DIM}m${empty}\x1b[0m `;
        out += `\x1b[38;5;${this.PALETTE.DIM}m(${cat.count} pts, avg ${cat.avgScore.toFixed(2)})\x1b[0m\n`;
      }
    }

    out += `\n\x1b[2m  Built for transparency. Built for the community.\x1b[0m\n`;
    return out;
  }
}
