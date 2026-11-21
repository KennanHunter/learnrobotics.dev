import {
  type Accessor,
  createEffect,
  createSignal,
  JSX,
  onCleanup,
  onMount,
} from "solid-js";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import soData from "./stack-overflow-data.json";
import tiobeData from "./tiobe-data.json";
import { Info } from "../../../../../lib/components/Info/Info";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const HIGHLIGHT = "Java";

type Row = { response: string; pct: number };

type TabId = "stackoverflow" | "tiobe";

type CountOption = 7 | 10 | "all";

const COUNT_OPTIONS: { value: CountOption; label: string }[] = [
  { value: 7, label: "Top 7" },
  { value: 10, label: "Top 10" },
  { value: "all", label: "All languages" },
];

const TABS: {
  id: TabId;
  label: string;
  rows: Row[];
  axisLabel: string;
}[] = [
  {
    id: "tiobe",
    label: "TIOBE Nov 2026",
    rows: tiobeData.data.map((d) => ({
      response: d.response,
      pct: d.pct,
    })),
    axisLabel: "Rating (%)",
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow 2026",
    rows: soData.data.map((d) => ({
      response: d.response,
      pct: d.pct * 100,
    })),
    axisLabel: "% of respondents",
  },
];

function sliceRows(rows: Row[], count: CountOption): Row[] {
  return count === "all" ? rows : rows.slice(0, count);
}

type ChartColors = {
  highlight: string;
  bar: string;
  border: string;
  fg: string;
  grid: string;
};

function resolveCssVar(name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

function readColors(): ChartColors {
  return {
    highlight: resolveCssVar("--color-red"),
    bar: resolveCssVar("--color-background-offset"),
    border: resolveCssVar("--color-foreground-subtle"),
    fg: resolveCssVar("--color-primary"),
    grid: resolveCssVar("--color-background-offset"),
  };
}

const EMPTY_COLORS: ChartColors = {
  highlight: "",
  bar: "",
  border: "",
  fg: "",
  grid: "",
};

function createChartColors(): Accessor<ChartColors> {
  const [colors, setColors] = createSignal<ChartColors>(EMPTY_COLORS, {
    equals: false,
  });

  onMount(() => {
    setColors(readColors());

    const refresh = () => setColors(readColors());

    const classObserver = new MutationObserver(refresh);
    classObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", refresh);

    onCleanup(() => {
      classObserver.disconnect();
      mq.removeEventListener("change", refresh);
    });
  });

  return colors;
}

export function LanguageUsageGraph(): JSX.Element {
  const [active, setActive] = createSignal<TabId>("tiobe");
  const [count, setCount] = createSignal<CountOption>(
    COUNT_OPTIONS[0]?.value || 7,
  );
  const colors = createChartColors();
  let canvas: HTMLCanvasElement | undefined;
  let chart: Chart<"bar", number[], string> | undefined;

  const rowsFor = (tabId: TabId, n: CountOption) =>
    sliceRows(TABS.find((t) => t.id === tabId)!.rows, n);
  const chartHeight = () =>
    Math.max(380, rowsFor(active(), count()).length * 38 + 140);

  const buildConfig = (
    tabId: TabId,
    n: CountOption,
    c: ChartColors,
  ): ChartConfiguration<"bar", number[], string> => {
    const tab = TABS.find((t) => t.id === tabId)!;
    const rows = sliceRows(tab.rows, n);
    const labels = rows.map((r) => r.response);
    const values = rows.map((r) => r.pct);
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: tab.axisLabel,
            data: values,
            backgroundColor: labels.map((l) =>
              l === HIGHLIGHT ? c.highlight : c.bar,
            ),
            borderColor: labels.map((l) =>
              l === HIGHLIGHT ? c.highlight : c.border,
            ),
            borderWidth: labels.map((l) => (l === HIGHLIGHT ? 0 : 1)),
            categoryPercentage: 0.75,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        layout: {
          padding: { top: 8, right: 24, bottom: 8, left: 8 },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${(ctx.parsed.x as number).toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: c.fg,
              callback: (v) => `${v}%`,
              padding: 6,
            },
            grid: { color: c.grid },
            title: {
              display: true,
              text: tab.axisLabel,
              color: c.fg,
              padding: { top: 10 },
            },
          },
          y: {
            ticks: {
              color: (ctx) =>
                (ctx.tick as { label?: string }).label === HIGHLIGHT
                  ? c.highlight
                  : c.fg,
              font: (ctx) => ({
                weight:
                  (ctx.tick as { label?: string } | undefined)?.label ===
                  HIGHLIGHT
                    ? "bold"
                    : "normal",
              }),
              autoSkip: false,
              padding: 8,
            },
            afterFit: (axis) => {
              axis.width = Math.max(axis.width, 140);
            },
            grid: { display: false },
          },
        },
      },
    };
  };

  onMount(() => {
    if (!canvas) return;
    chart = new Chart(canvas, buildConfig(active(), count(), colors()));
  });

  createEffect(() => {
    const id = active();
    const n = count();
    const c = colors();
    if (!chart) return;
    const next = buildConfig(id, n, c);
    // Mutate in place — Chart.js keeps internal references to the data and
    // options objects created at construction time, so wholesale reassignment
    // (chart.data = next.data) leaves the live chart pointing at the stale
    // ones. Replace array contents and merge option fields instead.
    chart.data.labels = next.data.labels;
    chart.data.datasets[0]!.data = next.data.datasets[0]!.data;
    chart.data.datasets[0]!.backgroundColor =
      next.data.datasets[0]!.backgroundColor;
    chart.data.datasets[0]!.borderColor = next.data.datasets[0]!.borderColor;
    chart.data.datasets[0]!.borderWidth = next.data.datasets[0]!.borderWidth;
    chart.data.datasets[0]!.label = next.data.datasets[0]!.label;
    Object.assign(chart.options, next.options);
    chart.resize();
    chart.update();
  });

  onCleanup(() => {
    chart?.destroy();
  });

  return (
    <figure class="not-prose my-8">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          class="inline-flex rounded-md border border-background-offset p-0.5 text-sm"
        >
          {TABS.map((t) => (
            <button
              role="tab"
              type="button"
              aria-selected={active() === t.id}
              onClick={() => setActive(t.id)}
              class={
                "rounded px-3 py-1 transition-colors " +
                (active() === t.id
                  ? "bg-background-offset text-primary"
                  : "text-foreground-muted hover:text-primary")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <label class="flex items-center gap-2 text-sm text-foreground-muted">
          <span>Show</span>
          <select
            class="rounded-md border border-background-offset bg-transparent px-2 py-1 text-primary"
            onChange={(e) => {
              const v = e.currentTarget.value;
              setCount(v === "all" ? "all" : (Number(v) as CountOption));
            }}
          >
            {COUNT_OPTIONS.map((o) => (
              <option value={String(o.value)} selected={count() === o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div class="relative w-full" style={{ height: `${chartHeight()}px` }}>
        <canvas ref={canvas} />
      </div>
      <figcaption class="mt-4 text-xs text-foreground-muted">
        Java highlighted.
      </figcaption>
      <ol class="mt-4 space-y-2 text-xs text-foreground-muted">
        <li>
          TIOBE Software BV. <em>TIOBE Index for November 2026</em>.{" "}
          <a
            class="underline"
            href="https://www.tiobe.com/tiobe-index/"
            target="_blank"
            rel="noreferrer"
          >
            www.tiobe.com
          </a>
          .
        </li>
        <li>
          Stack Exchange Inc. (2026).{" "}
          <em>&ldquo;Programming, scripting, and markup languages&rdquo;</em>.
          Stack Overflow Developer Survey 2026. Licensed under{" "}
          <a
            class="underline"
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noreferrer"
          >
            ODbL 1.0
          </a>
          .{" "}
          <a
            class="underline"
            href="https://survey.stackoverflow.co/2026/technology/data/languages"
            target="_blank"
            rel="noreferrer"
          >
            survey.stackoverflow.co
          </a>
          .{" "}
          <Info title="Stack Overflow?">
            I think stack overflow's developer survey has substantial sampling
            bias towards "hipper" developers, particularly web development, that
            might not be as indicative of the industry as a whole.
          </Info>
        </li>
      </ol>
    </figure>
  );
}
