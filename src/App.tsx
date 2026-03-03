import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { NormalizationEngine } from './engine';
import { ANSIRenderer } from './renderer';
import { MockDataGenerator, CITY_SCENARIOS } from './mock';
import { CivicChatbot } from './chatbot';
import { AnalysisResult, ResourceCategory, ChatMessage, CityScenario, RESOURCE_CATEGORIES } from './types';
import {
  Terminal as TerminalIcon,
  Map as MapIcon,
  GitCompareArrows,
  BarChart3,
  MessageCircle,
  Send,
  Sparkles,
  Globe,
  Zap,
  Heart,
  ChevronRight,
  X,
  RefreshCw,
  Layers,
  Thermometer,
  Info,
  Github,
  ArrowRight,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
  Eye,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Animated Counter ─────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '', prefix = '', duration = 800 }: {
  value: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = value;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <span>{prefix}{display}{suffix}</span>;
}

// ─── Tooltip ──────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode;[key: string]: any }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="tooltip-bubble">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Human-Friendly Stat Card ─────────────────────────────────────────
function StatCard({ label, value, suffix, color, icon: Icon, explanation, delay = 0 }: {
  label: string; value: number; suffix?: string; color: string;
  icon: any; explanation: string; delay?: number;
}) {
  return (
    <div className="stat-card animate-fade-in-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="stat-icon-circle" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <Tooltip text={explanation}>
          <HelpCircle size={12} style={{ color: 'var(--text-dim)', cursor: 'help' }} />
        </Tooltip>
      </div>
      <div className="text-3xl font-bold font-mono mt-1" style={{ color }}>
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
    </div>
  );
}

// ─── Friendly Score Badge ─────────────────────────────────────────────
function ScoreBadge({ score, label }: { score: number; label: string }) {
  let color = '#ef4444';
  let bg = 'rgba(239,68,68,0.1)';
  let emoji = '🔴';
  let verdict = 'Needs Attention';

  if (score > 70) {
    color = '#10b981'; bg = 'rgba(16,185,129,0.1)'; emoji = '🟢'; verdict = 'Looking Good';
  } else if (score > 40) {
    color = '#f59e0b'; bg = 'rgba(245,158,11,0.1)'; emoji = '🟡'; verdict = 'Room to Improve';
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
      style={{ background: bg, color, border: `1px solid ${color}25` }}>
      <span>{emoji}</span>
      <span>{label}: {verdict}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeTab, setActiveTab] = useState<'map' | 'diff' | 'analyze' | 'about'>('map');
  const [selectedScenario, setSelectedScenario] = useState<string>('nyc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bias, setBias] = useState<'rich' | 'poor' | 'random'>('random');
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<{ id: string; text: string; action?: () => void }[]>([]);

  const chatbot = useRef(new CivicChatbot(
    typeof process !== 'undefined' ? (process.env as any)?.GEMINI_API_KEY : undefined
  ));

  // ─── Friendly Intro Lines ──────────────────────────────────
  const introSteps = [
    { text: '👋  Welcome to Map-The-Gap', sub: 'A tool for communities, built by communities' },
    { text: '🗺️  We map city resources...', sub: 'Transit, food, parks, healthcare & more' },
    { text: '🔍  ...so you can spot the gaps', sub: 'Where services are promised but never arrive' },
    { text: '✊  Because every neighborhood deserves equity', sub: '' },
    { text: '🚀  Let\'s explore your city', sub: '' },
  ];

  // ── Intro Animation ──
  useEffect(() => {
    if (!showIntro) return;
    const timer = setInterval(() => {
      setIntroStep(prev => {
        if (prev >= introSteps.length - 1) {
          clearInterval(timer);
          setTimeout(() => setShowIntro(false), 1200);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [showIntro]);

  // ── Terminal Setup ──
  useEffect(() => {
    if (!terminalRef.current || showIntro) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#0a0a0a', foreground: '#d4d4d4', cursor: '#10b981' },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 16, /* Increased from 13 */
      rows: 28, /* Reduced rows to fit larger font */
      cols: 90,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    setTimeout(() => fitAddon.fit(), 100);

    xtermRef.current = term;

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
    };
  }, [showIntro]);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getScenario = useCallback((): CityScenario => {
    return CITY_SCENARIOS.find(s => s.id === selectedScenario) || CITY_SCENARIOS[0];
  }, [selectedScenario]);

  // ── Visualize ──
  const runVisualize = useCallback(() => {
    if (!xtermRef.current) return;
    clearExistingInterval();
    const term = xtermRef.current;
    term.clear();

    const scenario = getScenario();
    const catFilter = selectedCategory !== 'all' ? selectedCategory as ResourceCategory : undefined;

    const points = MockDataGenerator.generateScenario(scenario);
    const grid = NormalizationEngine.normalize(points, { width: 40, height: 20, categoryFilter: catFilter });
    const output = ANSIRenderer.render(grid, 0, heatmapMode);

    term.write(output.replace(/\n/g, '\r\n'));
    term.write(`\r\n\x1b[1;38;5;49m  ✓ Map loaded: ${scenario.name}${catFilter ? ` (${catFilter} only)` : ''}\x1b[0m\r\n`);

    const a = NormalizationEngine.analyze(grid, points);
    setAnalysis(a);
  }, [selectedScenario, selectedCategory, heatmapMode, getScenario, clearExistingInterval]);

  // ── Diff ──
  const runDiff = useCallback(() => {
    if (!xtermRef.current) return;
    clearExistingInterval();
    const term = xtermRef.current;
    term.clear();

    const scenario = getScenario();
    const { planned, actual } = MockDataGenerator.generatePlannedVsActual(scenario, 0.35);
    const plannedGrid = NormalizationEngine.normalize(planned, { width: 40, height: 20 });
    const actualGrid = NormalizationEngine.normalize(actual, { width: 40, height: 20 });
    const diffGrid = NormalizationEngine.diff(actualGrid, plannedGrid);

    let frame = 0;
    intervalRef.current = setInterval(() => {
      const output = ANSIRenderer.render(diffGrid, frame++);
      term.clear();
      term.write(output.replace(/\n/g, '\r\n'));
      if (frame > 16) {
        clearExistingInterval();
        term.write('\r\n\x1b[1;38;5;196m  ⚠  Gaps found! Flashing areas show where promises weren\'t kept.\x1b[0m\r\n');
      }
    }, 400);

    const a = NormalizationEngine.analyze(actualGrid, actual);
    setAnalysis(a);
  }, [getScenario, clearExistingInterval]);

  // ── Analyze ──
  const runAnalyze = useCallback(() => {
    if (!xtermRef.current) return;
    clearExistingInterval();
    const term = xtermRef.current;
    term.clear();

    const scenario = getScenario();
    const points = MockDataGenerator.generateScenario(scenario);
    const grid = NormalizationEngine.normalize(points, { width: 40, height: 20 });
    const a = NormalizationEngine.analyze(grid, points);

    const output = ANSIRenderer.renderAnalysis(a);
    term.write(output.replace(/\n/g, '\r\n'));

    setAnalysis(a);
  }, [getScenario, clearExistingInterval]);

  // ── Smart Suggestions Logic ──
  useEffect(() => {
    if (showIntro) return;

    const suggestions: { id: string; text: string; action?: () => void }[] = [];
    const scenario = getScenario();

    if (activeTab === 'map') {
      suggestions.push({ id: 's1', text: `✨ Exploring ${scenario.name}? Try filtering by "Food Access" to see where grocery stores are clustering.` });
      if (selectedCategory !== 'all') {
        suggestions.push({ id: 's2', text: `🔍 Looking at ${selectedCategory}? Toggle "Heatmap Mode" to see frequency-based concentration.` });
      }
      suggestions.push({ id: 's3', text: '💡 Did you know? High equity scores (>60) usually mean more accessible public transit.' });
    } else if (activeTab === 'diff') {
      suggestions.push({ id: 's4', text: '⚖️ This mode compares "Budgeted Resources" with "Reality". Flashing cells indicate discrepancies.' });
      suggestions.push({ id: 's5', text: '🛠️ Pro-tip: Screenshots of these flashing areas are powerful evidence for community meetings.' });
    } else if (activeTab === 'analyze') {
      suggestions.push({ id: 's6', text: '📊 These metrics help neighborhood leaders advocate for more balanced city funding.' });
    }

    // Shuffle or filter based on context
    setSmartSuggestions(suggestions.slice(0, 3));
  }, [selectedScenario, selectedCategory, activeTab, heatmapMode, showIntro]);

  // ── Run on tab/config change ──
  useEffect(() => {
    if (showIntro) return;
    const timer = setTimeout(() => {
      if (activeTab === 'map') runVisualize();
      else if (activeTab === 'diff') runDiff();
      else if (activeTab === 'analyze') runAnalyze();
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab, selectedScenario, selectedCategory, bias, heatmapMode, showIntro]);

  // ── Chat ──
  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: 'user', content: msg, timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await chatbot.current.chat(msg, {
        scenario: getScenario(),
        analysis: analysis || undefined,
        diffMode: activeTab === 'diff',
      });
      setChatMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant', content: response, timestamp: Date.now(),
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try rephrasing?',
        timestamp: Date.now(),
      }]);
    }

    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Helpers ──
  const getEquityColor = (eq: number) => eq > 60 ? '#10b981' : eq > 35 ? '#f59e0b' : '#ef4444';
  const getEquityLabel = (eq: number) => eq > 60 ? 'Fairly Distributed' : eq > 35 ? 'Somewhat Uneven' : 'Highly Unequal';
  const getEquityEmoji = (eq: number) => eq > 60 ? '✅' : eq > 35 ? '⚠️' : '🚨';

  // Tab configurations with friendly descriptions
  const tabs = [
    { id: 'map', label: 'Explore Map', icon: MapIcon, desc: 'See your city\'s resources' },
    { id: 'diff', label: 'Find Gaps', icon: GitCompareArrows, desc: 'Budget vs Reality' },
    { id: 'analyze', label: 'Deep Dive', icon: BarChart3, desc: 'Detailed numbers' },
    { id: 'about', label: 'Our Mission', icon: Heart, desc: 'Why this matters' },
  ];

  /* ═══════════════════════════════════════════════════════════════════
     INTRO SCREEN
     ═══════════════════════════════════════════════════════════════════ */
  if (showIntro) {
    return (
      <div className="intro-overlay">
        <div className="intro-content">
          {introSteps.slice(0, introStep + 1).map((step, i) => (
            <div
              key={i}
              className="intro-step animate-fade-in-up"
              style={{
                animationDelay: `${i * 100}ms`,
                opacity: i === introStep ? 1 : 0.35,
              }}
            >
              <span className="intro-step-text">{step.text}</span>
              {step.sub && <span className="intro-step-sub">{step.sub}</span>}
            </div>
          ))}
          {introStep >= introSteps.length - 1 && (
            <button
              className="btn-primary mt-6 animate-fade-in-up"
              style={{ animationDelay: '200ms' }}
              onClick={() => setShowIntro(false)}
            >
              Get Started <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     MAIN LAYOUT
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="bg-grid" />
      <div className="bg-radial" />

      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-icon animate-pulse-glow">
              <TerminalIcon size={18} className="text-black" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight uppercase" style={{ letterSpacing: '0.05em' }}>
                Sudo <span className="glow-text" style={{ color: '#10b981' }}>Map-The-Gap</span>
              </h1>
              <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>See the gaps. Bridge the divide.</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {tabs.map(tab => (
              <Tooltip key={tab.id} text={tab.desc}>
                <button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`btn-ghost ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              </Tooltip>
            ))}

            <div className="nav-divider" />

            <Tooltip text="Ask questions about the data in plain language">
              <button
                onClick={() => setShowChat(!showChat)}
                className={`btn-ghost ${showChat ? 'active' : ''}`}
              >
                <MessageCircle size={14} />
                Ask AI
              </button>
            </Tooltip>
          </nav>
        </div>
      </header>

      {/* ─── Smart Suggestions Component ─── */}
      {!showIntro && activeTab !== 'about' && smartSuggestions.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 mb-4 animate-fade-in">
          <div className="suggestions-container glass-card p-4 flex items-center justify-between gap-6 border-l-4 border-l-accent!">
            <div className="flex items-center gap-3 shrink-0">
              <Sparkles size={18} className="text-accent" />
              <span className="text-sm font-bold uppercase tracking-widest text-accent">Smart Context</span>
            </div>
            <div className="flex-1 flex gap-4 overflow-x-auto no-scrollbar">
              {smartSuggestions.map(s => (
                <div key={s.id} className="suggestion-pill text-sm py-2 px-5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 whitespace-nowrap hover:bg-white/10 transition-colors">
                  <ChevronRight size={14} className="text-accent" />
                  {s.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {activeTab !== 'about' ? (
          <div className="flex gap-6">
            {/* ═══ Left Sidebar ═══ */}
            <div className="w-72 shrink-0 space-y-4">

              {/* Quick Status Banner */}
              {analysis && (
                <div className="glass-card-glow p-4 animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{getEquityEmoji(analysis.equityIndex)}</span>
                    <div>
                      <div className="text-xl font-extrabold" style={{ color: getEquityColor(analysis.equityIndex) }}>
                        {getEquityLabel(analysis.equityIndex)}
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                        Equity Score: <span className="text-white">{analysis.equityIndex}/100</span>
                      </div>
                    </div>
                  </div>
                  <div className="equity-bar">
                    <div
                      className="equity-bar-fill"
                      style={{
                        width: `${analysis.equityIndex}%`,
                        background: `linear-gradient(90deg, ${getEquityColor(analysis.equityIndex)}, ${getEquityColor(analysis.equityIndex)}88)`,
                      }}
                    />
                  </div>
                  <p className="text-sm mt-3 leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {analysis.equityIndex > 60
                      ? 'Resources are fairly well-distributed across this area.'
                      : analysis.equityIndex > 35
                        ? 'Some neighborhoods get much more than others. Worth investigating.'
                        : 'Big gaps exist. Some neighborhoods have almost nothing while others have plenty.'}
                  </p>
                </div>
              )}

              {/* City Picker */}
              <div className="sidebar-card animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <div className="sidebar-card-header">
                  <MapPin size={13} style={{ color: '#10b981' }} />
                  <h3>Pick a City</h3>
                </div>
                <select
                  value={selectedScenario}
                  onChange={e => setSelectedScenario(e.target.value)}
                  className="select-field"
                >
                  {CITY_SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="sidebar-description">
                  {getScenario().description}
                </p>
              </div>

              {/* What to Look At */}
              <div className="sidebar-card animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                <div className="sidebar-card-header">
                  <Layers size={13} style={{ color: '#10b981' }} />
                  <h3>What to Show</h3>
                  <Tooltip text="Filter the map to show only one type of resource, like food or transit">
                    <HelpCircle size={11} style={{ color: 'var(--text-dim)', cursor: 'help' }} />
                  </Tooltip>
                </div>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="select-field"
                >
                  <option value="all">🌐  Everything</option>
                  {RESOURCE_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.emoji}  {c.label}</option>
                  ))}
                </select>

                {/* Category Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {RESOURCE_CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setSelectedCategory(selectedCategory === c.key ? 'all' : c.key)}
                      onMouseEnter={() => setHoveredCategory(c.key)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className="category-chip"
                      style={{
                        background: selectedCategory === c.key ? `hsl(${c.color * 1.4}, 50%, 15%)` : 'rgba(255,255,255,0.03)',
                        borderColor: selectedCategory === c.key ? `hsl(${c.color * 1.4}, 50%, 35%)` : 'var(--border-subtle)',
                        color: selectedCategory === c.key ? `hsl(${c.color * 1.4}, 60%, 65%)` : 'var(--text-dim)',
                      }}
                    >
                      {c.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Options */}
              <div className="sidebar-card animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <div className="sidebar-card-header">
                  <Eye size={13} style={{ color: '#10b981' }} />
                  <h3>Display Style</h3>
                </div>

                <label className="toggle-row">
                  <div className="flex items-center gap-2.5">
                    <Thermometer size={13} style={{ color: heatmapMode ? '#10b981' : 'var(--text-dim)' }} />
                    <div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Heatmap View</span>
                      <span className="text-[10px] block" style={{ color: 'var(--text-dim)' }}>Colors show intensity</span>
                    </div>
                  </div>
                  <div
                    className="toggle-switch"
                    style={{ background: heatmapMode ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)' }}
                    onClick={() => setHeatmapMode(!heatmapMode)}
                  >
                    <div className="toggle-knob" style={{ left: heatmapMode ? '18px' : '2px' }} />
                  </div>
                </label>

                <button
                  onClick={() => {
                    if (activeTab === 'map') runVisualize();
                    else if (activeTab === 'diff') runDiff();
                    else if (activeTab === 'analyze') runAnalyze();
                  }}
                  className="btn-primary w-full mt-3 animate-fade-in-up"
                  style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                >
                  <RefreshCw size={14} />
                  {activeTab === 'map' ? 'Refresh Map' : activeTab === 'diff' ? 'Re-run Comparison' : 'Re-analyze'}
                </button>
              </div>


              {/* How to Use This (collapsible hint) */}
              <div className="sidebar-card animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <div className="sidebar-card-header">
                  <HelpCircle size={13} style={{ color: 'var(--text-dim)' }} />
                  <h3 style={{ color: 'var(--text-dim)' }}>Quick Tips</h3>
                </div>
                <ul className="tips-list">
                  <li>🎯 Pick a city, then filter by resource type</li>
                  <li>🔥 Try <strong>Find Gaps</strong> to see budget vs reality</li>
                  <li>💬 Click <strong>Ask AI</strong> to chat about the data</li>
                  <li>📸 Screenshot results for presentations</li>
                </ul>
              </div>
            </div>

            {/* ═══ Terminal Area ═══ */}
            <div className="flex-1 min-w-0">
              {/* Main Content Area — Keyed to Tab to trigger re-animation */}
              <div key={activeTab} className="animate-fade-in" style={{ animationDuration: '0.6s' }}>
                {/* Horizontal Resource Breakdown */}
                {analysis && analysis.categoryBreakdown.length > 0 && (
                  <div className="breakdown-grid-container glass-card p-6 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-3 mb-6">
                      <BarChart3 size={18} style={{ color: '#10b981' }} />
                      <h3 className="text-lg font-extrabold uppercase tracking-widest text-accent">Resource Distribution</h3>
                    </div>
                    <div className="breakdown-grid">
                      {analysis.categoryBreakdown.map((cat, i) => {
                        const info = RESOURCE_CATEGORIES.find(c => c.key === cat.category);
                        const scorePercent = Math.round(cat.avgScore * 100);
                        const scoreColor = scorePercent > 60 ? '#10b981' : scorePercent > 35 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={cat.category} className="breakdown-item animate-fade-in-left" style={{ animationDelay: `${200 + (i * 50)}ms`, animationFillMode: 'both' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{info?.emoji}</span>
                              <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                {info?.label?.split('/')[0]?.split('&')[0]?.trim()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: scoreColor }}>
                                {scorePercent > 60 ? 'Good' : scorePercent > 35 ? 'Gaps' : 'Critical'}
                              </span>
                              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--text-dim)' }}>
                                {cat.count}
                              </span>
                            </div>
                            <div className="equity-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                              <div
                                className="equity-bar-fill"
                                style={{
                                  width: `${scorePercent}%`,
                                  background: scoreColor,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Stats Row */}
                {analysis && (
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <StatCard
                      label="Equity Score"
                      value={analysis.equityIndex}
                      suffix="/100"
                      color={getEquityColor(analysis.equityIndex)}
                      icon={Shield}
                      explanation="How fairly resources are spread. 100 = perfectly equal, 0 = extremely unequal."
                      delay={300}
                    />
                    <StatCard
                      label="Area Covered"
                      value={Math.round(analysis.coveragePercent)}
                      suffix="%"
                      color="#3b82f6"
                      icon={Globe}
                      explanation="What percentage of the mapped area has at least some resources nearby."
                      delay={400}
                    />
                    <StatCard
                      label="Desert Zones"
                      value={analysis.criticalDeserts}
                      color="#ef4444"
                      icon={AlertTriangle}
                      explanation="Areas with almost no resources at all. These are the communities that need attention most."
                      delay={500}
                    />
                    <StatCard
                      label="Gap Score"
                      value={analysis.disparityScore}
                      suffix="/100"
                      color="#f59e0b"
                      icon={TrendingUp}
                      explanation="How much variation exists between rich and poor areas. Higher = bigger gap between the best and worst served."
                      delay={600}
                    />
                  </div>
                )}

                {/* Human-readable summary */}
                {analysis && (
                  <div className="summary-banner animate-slide-up mb-4" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ScoreBadge score={analysis.equityIndex} label="Equity" />
                      <ScoreBadge score={100 - analysis.disparityScore} label="Consistency" />
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        {analysis.totalPoints} resources mapped across {getScenario().name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Terminal Window */}
                <div className="terminal-container scanlines animate-fade-in-up" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
                  <div className="terminal-header">
                    <div className="terminal-dot" style={{ background: '#ff5f57' }} />
                    <div className="terminal-dot" style={{ background: '#febc2e' }} />
                    <div className="terminal-dot" style={{ background: '#28c840' }} />
                    <span className="ml-3 text-[11px] font-mono" style={{ color: 'var(--text-dim)' }}>
                      {getScenario().name} — {activeTab === 'map' ? 'Resource Map' : activeTab === 'diff' ? 'Gap Analysis' : 'Equity Report'}
                    </span>
                  </div>
                  <div ref={terminalRef} style={{ width: '100%', height: '520px' }} />
                </div>
              </div>

              {/* Status Bar */}
              <div className="status-bar">
                <div className="flex items-center gap-4">
                  <span className="stat-badge">
                    <span className="live-dot" />
                    Live
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-dim)' }}>
                    {heatmapMode ? '🌡️ Heatmap view' : '🎮 Tile view'} • 40×20 grid
                  </span>
                </div>
                <Tooltip text="This map shows resource density. Each cell represents a neighborhood area.">
                  <span className="text-[11px] flex items-center gap-1 cursor-help" style={{ color: 'var(--text-dim)' }}>
                    <Info size={11} /> What am I looking at?
                  </span>
                </Tooltip>
              </div>
            </div>

            {/* ═══ Chat Sidebar ═══ */}
            {showChat && (
              <div className="chat-panel animate-fade-in">
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: '#10b981' }} />
                    <div>
                      <span className="text-sm font-bold block">Ask About This Data</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Plain language, real answers</span>
                    </div>
                  </div>
                  <button onClick={() => setShowChat(false)} className="close-btn">
                    <X size={14} />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="chat-empty">
                      <div className="chat-empty-icon animate-float">
                        <MessageCircle size={24} style={{ color: '#10b981' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        I'm here to help! 👋
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        Ask me anything about this data in plain language.
                      </p>
                      <div className="chat-suggestions">
                        {[
                          'Is this city fair to everyone?',
                          'Where are the biggest gaps?',
                          'What can I do about this?',
                          'Tell me about food access',
                        ].map(q => (
                          <button
                            key={q}
                            onClick={() => { setChatInput(q); }}
                            className="chat-suggestion-btn"
                          >
                            <ChevronRight size={10} className="shrink-0" />{q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles size={10} style={{ color: '#10b981' }} />
                          <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>Civic AI</span>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="chat-bubble assistant">
                      <div className="flex items-center gap-2">
                        <div className="typing-indicator">
                          <span /><span /><span />
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="chat-input-area">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChat()}
                      placeholder="Ask anything in plain language..."
                      className="chat-input flex-1"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="btn-primary px-3"
                      style={{ opacity: chatLoading || !chatInput.trim() ? 0.4 : 1 }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (

          /* ═══════════════════════════════════════════════════════════
             ABOUT / MISSION PAGE
             ═══════════════════════════════════════════════════════════ */
          <div className="max-w-4xl mx-auto space-y-14 py-8">
            {/* Hero */}
            <section className="text-center space-y-6 animate-fade-in-up">
              <div className="mission-icon animate-float">
                <Heart size={36} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-5xl font-light tracking-tight">
                Built <span className="italic font-semibold glow-text" style={{ color: '#10b981' }}>for People</span>, Not Spreadsheets
              </h2>
              <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                City resource data shouldn't require a degree to understand.
                This tool turns complex numbers into pictures anyone can read —
                <strong className="text-white"> so every community can see what's fair and what's not.</strong>
              </p>
            </section>

            {/* Who It's For */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  icon: Users,
                  title: 'Community Organizers',
                  desc: 'Take a screenshot of the map to your next city council meeting. Show them exactly where the gaps are — no data science needed.',
                  color: '#10b981',
                },
                {
                  icon: Shield,
                  title: 'Neighborhood Leaders',
                  desc: 'Compare what your city promised vs what actually arrived. Flashing tiles show exactly where commitments were broken.',
                  color: '#3b82f6',
                },
                {
                  icon: Eye,
                  title: 'Concerned Citizens',
                  desc: 'Just curious about your neighborhood? Pick your city, look at the map, and ask the AI to explain what you see in plain language.',
                  color: '#f59e0b',
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="glass-card p-7 space-y-4 animate-fade-in-up group"
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both', cursor: 'default' }}
                >
                  <div className="persona-icon" style={{ background: `${card.color}12`, border: `1px solid ${card.color}25` }}>
                    <card.icon size={24} style={{ color: card.color }} />
                  </div>
                  <h3 className="text-lg font-bold">{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
                </div>
              ))}
            </div>

            {/* How to Read the Map */}
            <section className="glass-card-glow p-8 space-y-5 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <h3 className="text-xl font-bold flex items-center gap-3">
                <MapIcon size={20} style={{ color: '#10b981' }} />
                How to Read the Map
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Every tile on the map represents a real neighborhood area. The look of each tile tells you how well-resourced that area is:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { tile: '🏛️', label: 'Thriving', desc: 'Lots of services available', color: '#10b981' },
                  { tile: '🌲', label: 'Decent', desc: 'Some resources nearby', color: '#059669' },
                  { tile: '░░', label: 'Sparse', desc: 'Few options available', color: '#f59e0b' },
                  { tile: '⬛', label: 'Desert', desc: 'Almost nothing here', color: '#ef4444' },
                ].map((t, i) => (
                  <div key={i} className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-3xl block mb-2">{t.tile}</span>
                    <span className="text-sm font-bold block" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{t.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* The Numbers that Matter */}
            <section className="glass-card p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <h3 className="text-xl font-bold flex items-center gap-3">
                <Zap size={20} style={{ color: '#f59e0b' }} />
                Why This Matters — Real Numbers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                {[
                  { stat: '23.5 million', label: 'Americans live in food deserts — areas with no nearby grocery store' },
                  { stat: '45%', label: 'of low-income neighborhoods lack adequate public transit options' },
                  { stat: '1 in 3', label: 'communities can\'t reach a doctor without a 30+ minute drive' },
                  { stat: '80%', label: 'of underserved areas show a gap between what was budgeted and delivered' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-2xl font-bold font-mono shrink-0" style={{ color: '#10b981' }}>{item.stat}</span>
                    <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* What You Can Do */}
            <section className="space-y-5 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <h3 className="text-xl font-bold flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                What You Can Do Right Now
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { step: '1', text: 'Pick your city from the dropdown', sub: 'See where resources cluster and where they don\'t' },
                  { step: '2', text: 'Click "Find Gaps" to compare budget vs reality', sub: 'Watch for flashing tiles — those are broken promises' },
                  { step: '3', text: 'Take a screenshot of what you find', sub: 'Bring it to your next community meeting or city council session' },
                  { step: '4', text: 'Ask the AI assistant to explain what you see', sub: 'Just type a question in plain language — it\'ll break down the data for you' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {item.step}
                    </div>
                    <div>
                      <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="pt-8 flex justify-between items-center text-sm" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
              <div className="flex items-center gap-3">
                <Github size={16} />
                <span>Free, open-source, and community-built</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart size={13} style={{ color: '#10b981' }} />
                <span>Because fair shouldn't be complicated</span>
              </div>
            </footer>
          </div>
        )}
      </main>
    </div >
  );
}
