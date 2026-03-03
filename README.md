# 🗺️ Sudo Map-The-Gap

**A terminal-based civic equity visualizer** that transforms complex GeoJSON/CSV city resource data into **16-bit RPG-style world maps** rendered entirely in the terminal using ANSI escape codes.

> *"Every pixel represents a community."*

---

## 🌍 Why This Matters

Resource allocation in cities is deeply unequal. **23.5 million Americans** live in food deserts. **45% of low-income neighborhoods** lack adequate public transit. Budget promises often don't match reality on the ground.

But this data is usually buried in spreadsheets, GIS tools, and PDF reports — formats that community organizers can't quickly act on.

**Map-The-Gap** changes this. By rendering resource density as an RPG-style map — where "lush forests" mean thriving areas and "barren deserts" mean underserved neighborhoods — we make disparity **visceral and scannable**.

---

## ✨ Core Features

### 🎮 16-Bit Visualization Engine
- Maps resource scores to RPG-style tiles: 🌲🏠 (resourceful) vs ░⬛ (barren)
- ANSI 256-color palette for rich, terminal-native rendering
- Heatmap overlay mode with continuous color gradients
- Sparkle animations for high-resource cells

### 📊 Data Normalization Engine
- Scales geographic coordinates to any terminal grid size
- Category-based filtering (transit, food, parks, healthcare, education, housing)
- Neighbor interpolation with distance decay for smooth terrain
- Gini-based equity index calculation

### ⚖️ Civic Diff ("Budget vs Reality")
- Compares "Planned Budget" with "Actual Services Delivered"
- Three severity levels: 🟡 Minor | 🟠 Moderate | 🔴 Critical
- Animated flashing for disparity cells — impossible to ignore
- Configurable disparity thresholds

### 🤖 AI Civic Assistant
- Gemini-powered chatbot for data analysis
- Context-aware: knows your current map, equity metrics, and scenario
- Falls back to rich template responses when offline
- Understands questions about transit, food, healthcare, equity, and organizing

### 🏙️ Preset City Scenarios
- **New York City** — Manhattan-centric resources with outer borough gaps
- **Chicago** — North-South divide with stark resource disparity
- **San Francisco** — Tech corridor vs underserved neighborhoods
- **Detroit** — Urban core rebuilding with widespread resource deserts

### 📈 Live Equity Metrics
- Equity Index (0-100, Gini-based)
- Coverage Percentage
- Critical Desert count
- Disparity Score
- Category-level breakdown with visual bars

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# ─── Web UI ───
npm run dev
# Open http://localhost:3000

# ─── CLI Commands ───
# Visualize a city with 16-bit map
npx tsx src/cli.ts visualize --scenario nyc

# Visualize with filters
npx tsx src/cli.ts visualize --scenario chicago --category food --heatmap

# Compare planned vs actual services
npx tsx src/cli.ts diff --scenario sf --disparity 0.4

# Run equity analysis
npx tsx src/cli.ts analyze --scenario detroit

# List all available scenarios
npx tsx src/cli.ts scenarios
```

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  GeoJSON / CSV   │────▶│  Normalization Engine │────▶│  16-bit ANSI       │
│  City Data       │     │  (engine.ts)          │     │  Renderer          │
└─────────────────┘     │  • Grid mapping       │     │  (renderer.ts)     │
                        │  • Interpolation      │     │  • Tile mapping    │
┌─────────────────┐     │  • Category filter    │     │  • Heatmap mode    │
│  Mock Generator  │────▶│  • Equity analysis    │     │  • Diff animation  │
│  (mock.ts)       │     └──────────────────────┘     └────────┬───────────┘
│  • City presets  │                                           │
│  • Bias control  │     ┌──────────────────────┐              ▼
└─────────────────┘     │  AI Chatbot           │     ┌────────────────────┐
                        │  (chatbot.ts)         │────▶│  Terminal / Web UI  │
                        │  • Gemini integration │     │  (cli.ts / App.tsx) │
                        │  • Civic insights     │     └────────────────────┘
                        └──────────────────────┘
```

---

## 📁 File Structure

```
src/
├── types.ts       # Core types: coordinates, grid cells, analysis, chatbot
├── engine.ts      # Data normalization, grid mapping, equity analysis
├── renderer.ts    # 16-bit ANSI rendering, heatmap, diff animation
├── mock.ts        # Mock data generator with 4 city scenarios
├── chatbot.ts     # AI civic assistant (Gemini + template fallback)
├── cli.ts         # CLI entry point: visualize, diff, analyze, scenarios
├── App.tsx        # Web UI: full interactive dashboard
├── main.tsx       # React entry point
└── index.css      # Design system: glassmorphism, animations, CRT effects
```

---

## 🎯 For Community Organizers

1. **Load a scenario** that matches your city
2. **Run the visualizer** to see resource distribution
3. **Use Civic Diff** to compare what was promised vs what was delivered
4. **Screenshot the results** for city council presentations
5. **Ask the AI assistant** for context-aware civic insights
6. **Run it over SSH** — no browser needed, works on any terminal

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript |
| Rendering | ANSI 256-color escape codes |
| CLI | Commander.js |
| AI | Google Gemini API |
| Web Preview | React + Xterm.js |
| Styling | Tailwind CSS + Custom Design System |

---

## 🤝 Contributing

This is open-source civic tech. Contributions welcome:

- **Add new city scenarios** — submit PRs with real GeoJSON data
- **Extend resource categories** — add broadband, childcare, etc.
- **Improve the renderer** — new tile sets, terrain transitions
- **Accessibility** — screen reader compatibility, high-contrast modes

---

## 📜 License

MIT — Built for transparency. Built for the community.

*Because data is power, but only when communities can see it.*
