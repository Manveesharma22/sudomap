import { ResourcePoint, MapGrid, NormalizationOptions, GridCell, AnalysisResult, ResourceCategory, RESOURCE_CATEGORIES } from './types';

/**
 * Data Normalization Engine
 * Scales geographic coordinates to a 2D terminal grid with analysis.
 */
export class NormalizationEngine {
  /**
   * Normalizes a list of points into a fixed-size grid.
   */
  static normalize(points: ResourcePoint[], options: NormalizationOptions): MapGrid {
    const { width, height, padding = 0, categoryFilter } = options;

    // Apply category filter if specified
    const filtered = categoryFilter
      ? points.filter(p => p.category === categoryFilter)
      : points;

    if (filtered.length === 0) {
      return {
        width,
        height,
        cells: Array.from({ length: height }, () =>
          Array.from({ length: width }, () => ({ score: 0, points: [] }))
        ),
      };
    }

    // Find bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    filtered.forEach(p => {
      minLat = Math.min(minLat, p.coord.lat);
      maxLat = Math.max(maxLat, p.coord.lat);
      minLng = Math.min(minLng, p.coord.lng);
      maxLng = Math.max(maxLng, p.coord.lng);
    });

    // Add padding to bounds
    const latRange = maxLat - minLat || 0.1;
    const lngRange = maxLng - minLng || 0.1;

    minLat -= latRange * padding;
    maxLat += latRange * padding;
    minLng -= lngRange * padding;
    maxLng += lngRange * padding;

    const finalLatRange = maxLat - minLat;
    const finalLngRange = maxLng - minLng;

    // Initialize grid
    const cells: GridCell[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ score: 0, points: [] }))
    );

    // Map points to grid
    filtered.forEach(p => {
      const x = Math.min(width - 1, Math.max(0, Math.floor(((p.coord.lng - minLng) / finalLngRange) * (width - 1))));
      const y = Math.min(height - 1, Math.max(0, Math.floor(((maxLat - p.coord.lat) / finalLatRange) * (height - 1))));

      cells[y][x].points.push(p);
    });

    // Calculate aggregate scores and dominant categories
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellPoints = cells[y][x].points;
        if (cellPoints.length > 0) {
          cells[y][x].score = cellPoints.reduce((sum, p) => sum + p.score, 0) / cellPoints.length;
          cells[y][x].dominantCategory = this.getDominantCategory(cellPoints);
        } else {
          cells[y][x].score = this.getNeighborAverage(cells, x, y, width, height);
        }
      }
    }

    return { width, height, cells };
  }

  /**
   * Enhanced neighbor interpolation with configurable decay.
   */
  private static getNeighborAverage(cells: GridCell[][], x: number, y: number, width: number, height: number, radius: number = 2): number {
    let sum = 0;
    let weight = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (cells[ny][nx].points.length > 0) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const decay = 1 / (1 + dist);
            sum += cells[ny][nx].score * decay;
            weight += decay;
          }
        }
      }
    }

    return weight > 0 ? (sum / weight) * 0.4 : 0;
  }

  /**
   * Determine dominant resource category in a set of points.
   */
  private static getDominantCategory(points: ResourcePoint[]): ResourceCategory {
    const counts: Record<string, number> = {};
    points.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ResourceCategory;
  }

  /**
   * Compares two grids and returns a new grid with diff flags and severity.
   */
  static diff(actual: MapGrid, planned: MapGrid): MapGrid {
    const width = Math.min(actual.width, planned.width);
    const height = Math.min(actual.height, planned.height);

    const cells: GridCell[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const actualScore = actual.cells[y]?.[x]?.score ?? 0;
        const plannedScore = planned.cells[y]?.[x]?.score ?? 0;
        const diff = Math.abs(actualScore - plannedScore);

        let severity: 'minor' | 'moderate' | 'critical' | undefined;
        let isDiff = false;

        if (diff > 0.5) {
          severity = 'critical';
          isDiff = true;
        } else if (diff > 0.3) {
          severity = 'moderate';
          isDiff = true;
        } else if (diff > 0.15) {
          severity = 'minor';
          isDiff = true;
        }

        return {
          score: actualScore,
          points: actual.cells[y]?.[x]?.points ?? [],
          isDiff,
          diffSeverity: severity,
          dominantCategory: actual.cells[y]?.[x]?.dominantCategory,
        };
      })
    );

    return { width, height, cells };
  }

  /**
   * Analyze a grid and return equity metrics.
   */
  static analyze(grid: MapGrid, points: ResourcePoint[]): AnalysisResult {
    let totalScore = 0;
    let cellsWithResources = 0;
    let criticalDeserts = 0;
    const totalCells = grid.width * grid.height;
    const scores: number[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const score = grid.cells[y][x].score;
        scores.push(score);
        totalScore += score;
        if (grid.cells[y][x].points.length > 0) cellsWithResources++;
        if (score < 0.1) criticalDeserts++;
      }
    }

    const averageScore = totalScore / totalCells;
    const coveragePercent = (cellsWithResources / totalCells) * 100;

    // Gini-like equity index (inverted so higher = more equitable)
    scores.sort((a, b) => a - b);
    let giniSum = 0;
    const n = scores.length;
    for (let i = 0; i < n; i++) {
      giniSum += (2 * (i + 1) - n - 1) * scores[i];
    }
    const giniCoeff = (totalScore > 0 && n > 0) ? giniSum / (n * totalScore) : 0;
    const equityIndex = Math.round((1 - Math.abs(giniCoeff)) * 100);

    // Category breakdown
    const catMap = new Map<ResourceCategory, { count: number; totalScore: number }>();
    points.forEach(p => {
      const existing = catMap.get(p.category) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += p.score;
      catMap.set(p.category, existing);
    });

    const categoryBreakdown = RESOURCE_CATEGORIES
      .filter(c => catMap.has(c.key))
      .map(c => {
        const data = catMap.get(c.key)!;
        return {
          category: c.key,
          count: data.count,
          avgScore: data.totalScore / data.count,
        };
      });

    // Disparity score: standard deviation of cell scores
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / n;
    const disparityScore = Math.round(Math.sqrt(variance) * 100);

    return {
      equityIndex,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      totalPoints: points.length,
      averageScore: Math.round(averageScore * 1000) / 1000,
      criticalDeserts,
      categoryBreakdown,
      disparityScore,
    };
  }
}
