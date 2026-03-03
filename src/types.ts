/**
 * Core types for Sudo Map-The-Gap
 * A terminal-based civic equity visualizer
 */

// ─── Resource Categories ────────────────────────────────────────────
export type ResourceCategory = 'transit' | 'food' | 'parks' | 'healthcare' | 'education' | 'housing';

export const RESOURCE_CATEGORIES: { key: ResourceCategory; label: string; emoji: string; color: number }[] = [
  { key: 'transit',    label: 'Transit Stops',    emoji: '🚌', color: 75  },
  { key: 'food',       label: 'Grocery / Food',   emoji: '🍎', color: 208 },
  { key: 'parks',      label: 'Parks & Green',     emoji: '🌲', color: 34  },
  { key: 'healthcare', label: 'Healthcare',        emoji: '🏥', color: 196 },
  { key: 'education',  label: 'Education',         emoji: '📚', color: 220 },
  { key: 'housing',    label: 'Affordable Housing',emoji: '🏠', color: 141 },
];

// ─── Coordinate + Resource Point ────────────────────────────────────
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ResourcePoint {
  id: string;
  coord: Coordinate;
  score: number; // 0 to 1
  type: string;
  category: ResourceCategory;
  label?: string;
}

// ─── Grid Structures ────────────────────────────────────────────────
export interface GridCell {
  score: number;
  points: ResourcePoint[];
  isDiff?: boolean;
  diffSeverity?: 'minor' | 'moderate' | 'critical';
  dominantCategory?: ResourceCategory;
}

export interface MapGrid {
  width: number;
  height: number;
  cells: GridCell[][];
}

export interface NormalizationOptions {
  width: number;
  height: number;
  padding?: number;
  categoryFilter?: ResourceCategory;
}

// ─── Analysis Results ───────────────────────────────────────────────
export interface AnalysisResult {
  equityIndex: number;         // 0-100, higher = more equitable
  coveragePercent: number;     // % of grid cells with resources
  totalPoints: number;
  averageScore: number;
  criticalDeserts: number;     // cells with score < 0.1
  categoryBreakdown: { category: ResourceCategory; count: number; avgScore: number }[];
  disparityScore: number;      // 0-100, higher = more disparity
}

// ─── City Scenarios ─────────────────────────────────────────────────
export interface CityScenario {
  id: string;
  name: string;
  center: Coordinate;
  radius: number;
  description: string;
  clusters: ScenarioCluster[];
}

export interface ScenarioCluster {
  category: ResourceCategory;
  center: Coordinate;
  radius: number;
  count: number;
  scoreBias: 'high' | 'low' | 'mixed';
  label?: string;
}

// ─── Chatbot ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatContext {
  scenario?: CityScenario;
  analysis?: AnalysisResult;
  activeCategory?: ResourceCategory;
  diffMode?: boolean;
}

// ─── Render Configuration ───────────────────────────────────────────
export interface RenderConfig {
  showLegend: boolean;
  showStats: boolean;
  heatmapMode: boolean;
  animateFrames: boolean;
  frameDelay: number;
}
