import { ResourcePoint, ResourceCategory, CityScenario, ScenarioCluster } from './types';

/**
 * Mock Data Generator
 * Generates realistic city resource distributions.
 */
export class MockDataGenerator {
  /**
   * Simple point generation with bias.
   */
  static generate(
    count: number,
    center: { lat: number; lng: number },
    radius: number,
    bias: 'rich' | 'poor' | 'random' = 'random',
    category: ResourceCategory = 'transit'
  ): ResourcePoint[] {
    const points: ResourcePoint[] = [];
    const categories: ResourceCategory[] = ['transit', 'food', 'parks', 'healthcare', 'education', 'housing'];

    for (let i = 0; i < count; i++) {
      const r = Math.random() * radius;
      const theta = Math.random() * 2 * Math.PI;

      const lat = center.lat + r * Math.cos(theta);
      const lng = center.lng + r * Math.sin(theta);

      let score = Math.random();

      if (bias === 'rich') {
        score = Math.max(0.2, 1 - (r / radius) + (Math.random() * 0.2 - 0.1));
      } else if (bias === 'poor') {
        score = Math.min(0.8, (r / radius) + (Math.random() * 0.2 - 0.1));
      }

      const cat = category === 'transit' && bias === 'random'
        ? categories[Math.floor(Math.random() * categories.length)]
        : category;

      points.push({
        id: `p-${i}`,
        coord: { lat, lng },
        score: Math.min(1, Math.max(0, score)),
        type: 'resource',
        category: cat,
        label: `${cat} resource #${i}`,
      });
    }

    return points;
  }

  /**
   * Generate rich scenario data from a CityScenario config.
   */
  static generateScenario(scenario: CityScenario): ResourcePoint[] {
    const points: ResourcePoint[] = [];
    let id = 0;

    scenario.clusters.forEach(cluster => {
      for (let i = 0; i < cluster.count; i++) {
        const r = Math.random() * cluster.radius;
        const theta = Math.random() * 2 * Math.PI;

        const lat = cluster.center.lat + r * Math.cos(theta);
        const lng = cluster.center.lng + r * Math.sin(theta);

        let score: number;
        switch (cluster.scoreBias) {
          case 'high':
            score = 0.6 + Math.random() * 0.4;
            break;
          case 'low':
            score = Math.random() * 0.35;
            break;
          default:
            score = Math.random();
        }

        points.push({
          id: `${scenario.id}-${id++}`,
          coord: { lat, lng },
          score: Math.min(1, Math.max(0, score)),
          type: 'resource',
          category: cluster.category,
          label: cluster.label || `${cluster.category} point`,
        });
      }
    });

    return points;
  }

  /**
   * Generate "planned" vs "actual" with configurable disparity.
   */
  static generatePlannedVsActual(
    scenario: CityScenario,
    disparityLevel: number = 0.3
  ): { planned: ResourcePoint[]; actual: ResourcePoint[] } {
    const planned = this.generateScenario(scenario);

    // Actual: degrade scores in certain areas and remove some points
    const actual = planned
      .filter(() => Math.random() > disparityLevel * 0.3) // Some services never deployed
      .map(p => ({
        ...p,
        id: p.id.replace(scenario.id, `${scenario.id}-actual`),
        score: Math.max(0, p.score - (Math.random() * disparityLevel)),
      }));

    return { planned, actual };
  }
}

// ─── Preset City Scenarios ──────────────────────────────────────────

export const CITY_SCENARIOS: CityScenario[] = [
  {
    id: 'nyc',
    name: 'New York City',
    center: { lat: 40.7128, lng: -74.006 },
    radius: 0.08,
    description: 'Manhattan-centric resources with outer borough gaps',
    clusters: [
      { category: 'transit', center: { lat: 40.758, lng: -73.985 }, radius: 0.02, count: 40, scoreBias: 'high', label: 'Midtown Transit Hub' },
      { category: 'transit', center: { lat: 40.685, lng: -73.975 }, radius: 0.015, count: 15, scoreBias: 'low', label: 'South Brooklyn Transit' },
      { category: 'food', center: { lat: 40.730, lng: -73.997 }, radius: 0.018, count: 35, scoreBias: 'high', label: 'Village Grocery Cluster' },
      { category: 'food', center: { lat: 40.820, lng: -73.950 }, radius: 0.02, count: 10, scoreBias: 'low', label: 'Harlem Food Desert' },
      { category: 'parks', center: { lat: 40.785, lng: -73.968 }, radius: 0.015, count: 20, scoreBias: 'high', label: 'Central Park Zone' },
      { category: 'healthcare', center: { lat: 40.764, lng: -73.955 }, radius: 0.012, count: 25, scoreBias: 'high', label: 'Upper East Medical' },
      { category: 'healthcare', center: { lat: 40.650, lng: -73.950 }, radius: 0.025, count: 8, scoreBias: 'low', label: 'Flatbush Health Gap' },
      { category: 'education', center: { lat: 40.729, lng: -73.996 }, radius: 0.02, count: 20, scoreBias: 'mixed', label: 'Downtown Education' },
      { category: 'housing', center: { lat: 40.700, lng: -73.990 }, radius: 0.03, count: 15, scoreBias: 'low', label: 'Brooklyn Housing Crisis' },
    ],
  },
  {
    id: 'chicago',
    name: 'Chicago',
    center: { lat: 41.8781, lng: -87.6298 },
    radius: 0.08,
    description: 'North-South divide with stark resource disparity',
    clusters: [
      { category: 'transit', center: { lat: 41.882, lng: -87.628 }, radius: 0.015, count: 35, scoreBias: 'high', label: 'Loop Transit' },
      { category: 'transit', center: { lat: 41.835, lng: -87.625 }, radius: 0.02, count: 10, scoreBias: 'low', label: 'South Side Transit' },
      { category: 'food', center: { lat: 41.895, lng: -87.635 }, radius: 0.018, count: 30, scoreBias: 'high', label: 'North Side Groceries' },
      { category: 'food', center: { lat: 41.830, lng: -87.615 }, radius: 0.025, count: 8, scoreBias: 'low', label: 'Englewood Food Desert' },
      { category: 'parks', center: { lat: 41.868, lng: -87.617 }, radius: 0.01, count: 15, scoreBias: 'high', label: 'Grant Park Zone' },
      { category: 'healthcare', center: { lat: 41.890, lng: -87.625 }, radius: 0.015, count: 20, scoreBias: 'high', label: 'Gold Coast Medical' },
      { category: 'healthcare', center: { lat: 41.840, lng: -87.630 }, radius: 0.02, count: 5, scoreBias: 'low', label: 'South Side Health Gap' },
      { category: 'education', center: { lat: 41.878, lng: -87.630 }, radius: 0.02, count: 18, scoreBias: 'mixed', label: 'Downtown Education' },
      { category: 'housing', center: { lat: 41.845, lng: -87.640 }, radius: 0.025, count: 12, scoreBias: 'low', label: 'West Side Housing' },
    ],
  },
  {
    id: 'sf',
    name: 'San Francisco',
    center: { lat: 37.7749, lng: -122.4194 },
    radius: 0.06,
    description: 'Tech corridor vs underserved neighborhoods',
    clusters: [
      { category: 'transit', center: { lat: 37.790, lng: -122.400 }, radius: 0.012, count: 30, scoreBias: 'high', label: 'FiDi Transit' },
      { category: 'transit', center: { lat: 37.740, lng: -122.420 }, radius: 0.02, count: 8, scoreBias: 'low', label: 'Bayview Transit' },
      { category: 'food', center: { lat: 37.780, lng: -122.410 }, radius: 0.015, count: 28, scoreBias: 'high', label: 'SOMA Grocery' },
      { category: 'food', center: { lat: 37.725, lng: -122.430 }, radius: 0.018, count: 6, scoreBias: 'low', label: 'Hunters Point Food Desert' },
      { category: 'parks', center: { lat: 37.769, lng: -122.483 }, radius: 0.02, count: 18, scoreBias: 'high', label: 'Golden Gate Park' },
      { category: 'healthcare', center: { lat: 37.763, lng: -122.458 }, radius: 0.01, count: 22, scoreBias: 'high', label: 'UCSF Medical' },
      { category: 'education', center: { lat: 37.775, lng: -122.418 }, radius: 0.015, count: 15, scoreBias: 'mixed', label: 'Civic Center Schools' },
      { category: 'housing', center: { lat: 37.755, lng: -122.415 }, radius: 0.025, count: 20, scoreBias: 'low', label: 'Mission Housing Crisis' },
    ],
  },
  {
    id: 'detroit',
    name: 'Detroit',
    center: { lat: 42.3314, lng: -83.0458 },
    radius: 0.07,
    description: 'Urban core rebuilding with widespread resource deserts',
    clusters: [
      { category: 'transit', center: { lat: 42.336, lng: -83.048 }, radius: 0.01, count: 15, scoreBias: 'mixed', label: 'Downtown Transit' },
      { category: 'transit', center: { lat: 42.360, lng: -83.070 }, radius: 0.03, count: 5, scoreBias: 'low', label: 'Northwest Transit Gap' },
      { category: 'food', center: { lat: 42.335, lng: -83.050 }, radius: 0.012, count: 12, scoreBias: 'mixed', label: 'Downtown Grocery' },
      { category: 'food', center: { lat: 42.370, lng: -83.035 }, radius: 0.035, count: 4, scoreBias: 'low', label: 'East Side Food Desert' },
      { category: 'parks', center: { lat: 42.338, lng: -83.065 }, radius: 0.015, count: 8, scoreBias: 'mixed', label: 'Corktown Parks' },
      { category: 'healthcare', center: { lat: 42.355, lng: -83.060 }, radius: 0.01, count: 10, scoreBias: 'high', label: 'Henry Ford Health' },
      { category: 'healthcare', center: { lat: 42.310, lng: -83.040 }, radius: 0.03, count: 3, scoreBias: 'low', label: 'Southwest Health Gap' },
      { category: 'education', center: { lat: 42.355, lng: -83.050 }, radius: 0.015, count: 10, scoreBias: 'mixed', label: 'Midtown Education' },
      { category: 'housing', center: { lat: 42.340, lng: -83.045 }, radius: 0.04, count: 18, scoreBias: 'low', label: 'Widespread Housing Need' },
    ],
  },
];
