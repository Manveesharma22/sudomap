# Sudo Map-The-Gap — Civic Equity Visualizer

![Sudo Map-The-Gap Hero Banner](file:///Users/manvee/.gemini/antigravity/brain/4dca7d4b-1c48-4074-8726-79307dfd6f76/sudomap_hero_banner_1772536160233.png)

> [!IMPORTANT]
> **Sudo Map-The-Gap** is a high-density civic empathy tool. It transforms dry city resource data into a compelling 16-bit RPG narrative, empowering community leaders to visualize disparities and advocate for more equitable urban futures.

## 🌟 The Vision: "Making the Gap Visible"
In urban planning, the most critical stories are often hidden in spreadsheets. We use a retro-gaming aesthetic to turn "geographic data" into "neighborhood stories." When a community organizer can *see* a healthcare desert as a literal barren 16-bit wasteland, the argument for funding becomes undeniable.

## 🚀 Key Features

### 🎮 Premium 16-bit Dashboard
- **Glassmorphic UI**: A high-contrast, organic interface with fluid motion and staggered entrance animations.
- **Robust Terminal Visualizer**: A specialized xterm.js implementation with diagnostic "heartbeat" feedback and animation-aware fitting.
- **Heatmap Transitions**: Instant switching between terrain-based resource views and concentration heatmaps.

### 🧠 Advanced Civic Engine
- **Equity Analysis**: Real-time Gini-based normalization that calculates neighborhood coverage and desert zones.
- **Civic Diffing**: A unique tool to compare "Planned" vs "Actual" resource presence. Flashing cells highlight where commitments were broken.
- **Smart Context**: A suggestion engine that interprets current data to provide tips for activists and neighborhood leaders.

### 🤖 AI Civic Assistant
- **Gemini-Powered Chat**: A deep integration with Google Gemini that understands the current map context to provide plain-language explanations of complex civic metrics.

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS (Premium Micro-animation Engine)
- **Engine**: Civic-Normalization-TS
- **AI**: Gemini 1.5 Pro API
- **Terminal Core**: xterm.js + FitAddon

## ⚡ Quick Start

### 1. Installation
```bash
git clone https://github.com/Manveesharma22/sudomap.git
cd sudomap
npm install
```

### 2. Environment
Copy the example environment file and add your GEMINI_API_KEY:
```bash
cp .env.example .env
```

### 3. Launch
```bash
npm run dev
```

## 📖 CLI Integration
For developers and data scientists, Map-The-Gap provides a powerful CLI:
```bash
# Visualize a custom scenario
npx tsx src/cli.ts visualize --scenario nyc --heatmap

# Export a full equity report
npx tsx src/cli.ts analyze --scenario chicago
```

---

> [!TIP]
> **Use the "Find Gaps" mode to hold governments accountable.** Taking a screenshot of the flashing "Budget vs Reality" diff is a powerful artifact for community meetings.

*Built for the people. Built for the community. Built for a fair future.*
