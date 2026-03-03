# Sudo Map-The-Gap — Civic Equity Visualizer

**Sudo Map-The-Gap** is a premium, high-impact civic equity visualizer designed for community organizers and city planners. It combines a retro 16-bit RPG aesthetic with advanced data science and context-aware AI to illuminate resource disparities across urban landscapes.

![Sudo Map-The-Gap Overview](file:///Users/manvee/.gemini/antigravity/brain/7212c5a3-f57a-4ed5-9b5f-3b3cdd4a867a/refined_horizontal_dashboard.png)

## Core Philosophy: "Visualizing the Invisible"
In many cities, the gap between well-resourced neighborhoods and underserved communities is stark but often buried in complex spreadsheets. Sudo Map-The-Gap transforms this data into a playable, interactive map that anyone can understand, turning dry statistics into a compelling narrative for advocacy.

## Key Features

### 🎨 Premium 16-bit Dashboard
- **Horizontal Resource Breakdown**: A high-density grid showing distribution across categories like Transit, Food, Healthcare, and Housing.
- **Glassmorphism Interface**: Sleek, modern UI with organic motion, staggered animations, and a rich dark theme.
- **Terminal Visualizer**: A high-fidelity ANSI map renderer that supports heatmaps, severity-based diffing, and terrain transitions.

### 🧠 Intelligent Analysis
- **Civic Engine 2.0**: Advanced Gini-based equity normalization and neighborhood interpolation.
- **Smart Context**: A dynamic suggestion engine that provides tailored facts and tips based on the current city and analysis type.
- **Animated Civic Diff**: A powerful tool to compare "Planned" vs "Actual" resource allocation, highlighting critical deserts with alarming clarity.

### 🤖 AI Civic Assistant
- **Gemini-Powered Chat**: A context-aware chatbot that analyzes current map data to answer complex questions about community impact and potential interventions.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Vanilla CSS (Premium Motion Engine)
- **Maps**: xterm.js (ANSI Renderer)
- **AI**: Google Gemini API
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Manveesharma22/sudomap.git
   cd sudomap
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Add your VITE_GEMINI_API_KEY
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## CLI Usage
Sudo Map-The-Gap also features a powerful command-line interface:
```bash
# Visualize a city scenario
npx tsx src/cli.ts visualize --scenario nyc

# Run an equity analysis
npx tsx src/cli.ts analyze --scenario chicago
```

## Contributing
We welcome contributions! Whether it's adding new city scenarios, improving the rendering engine, or refining the AI's civic knowledge, please feel free to open a PR.

---
*Built with ❤️ for a more equitable future.*
