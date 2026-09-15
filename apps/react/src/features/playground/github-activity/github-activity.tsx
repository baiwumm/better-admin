/**
 * Vendor 自 rare-ui（MIT）`github-activity`，快照来源 https://rareui.com/r/github-activity.json（2026-09-15）。
 * 本地改动：`cn` 改自 @heroui/react 导入；移除 "use client" 指令（Vite SPA 无需，Next 端复用时自行加回）；
 * shadcn 语义类 / 硬编码色替换为项目 HeroUI token（见 plan-dashboard-playground.md §6 实施约束）；
 * 增补 `formatHeading` / `formatDay` / `toggleLabels` 三个可选 i18n 出口（缺省沿用上游英文）；
 * 内置 GitHub API 拉取逻辑保留但演示不传 `username`，静态数据经 props 注入、不连外部 API。
 * 其余逻辑与上游保持一致，便于后续同步。
 */
import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { cn } from "@heroui/react";

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type Contribution = {
  date: string;
  count: number;
  level: ContributionLevel;
};

export type RepoContribution = {
  name: string;
  count: number;
  logo?: React.ReactNode;
  href?: string;
};

const DEFAULT_ACCENT = "#39d353";
const DEFAULT_CELL_SIZE = 11;
const DEFAULT_LABEL = "Top contributions in:";
const DEFAULT_MONTHS = 12;
const WEEKS_PER_MONTH = 365.25 / 12 / 7;
const STACK_LIMIT = 3;
const MIN_CARD_WIDTH = 320;
const MIN_LABEL_WEEKS = 3;
// the p-4 on the card, both sides; the width math below has to add it back
const CARD_PADDING = 32;

const gapFor = (cellSize: number) => Math.max(2, Math.round(cellSize / 4));
// never zero: weeks.slice(-0) would hand back the whole history instead of nothing
const weeksFor = (months: number) =>
  Math.max(1, Math.ceil(months * WEEKS_PER_MONTH));

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", bounce: 0.2, duration: 0.62 } as const;
const HEADER_SPRING = { ...SPRING, bounce: 0.45 } as const;
const ROW_SPRING = { ...SPRING, bounce: 0.26, delay: 0.08 } as const;
const ROW_OFFSET = 16;
const CELL_FADE = { duration: 0.2, ease: EASE_OUT } as const;
const TOOLTIP_FADE = { duration: 0.14, ease: EASE_OUT } as const;
const TOOLTIP_EDGE = 8;
const COLUMN_STAGGER = 0.012;
const LABEL_BLUR = 6;
const LABEL_REVEAL = { duration: 0.45, ease: EASE_OUT } as const;

const LEVELS = [0, 1, 2, 3, 4] as const;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toMonthLabels(weeks: Contribution[][]) {
  const labels: (string | null)[] = weeks.map(() => null);
  const monthAt = (index: number) => weeks[index]?.[0]?.date.slice(5, 7);

  let start = 0;

  for (let i = 1; i <= weeks.length; i++) {
    if (i < weeks.length && monthAt(i) === monthAt(start)) continue;
    // a shorter run is narrower than the label itself, so it would sit under the next month
    if (i - start >= MIN_LABEL_WEEKS) {
      labels[start] = MONTH_NAMES[Number(monthAt(start)) - 1] ?? null;
    }
    start = i;
  }

  return labels;
}

const LEVEL_OPACITY: Record<ContributionLevel, number> = {
  0: 0,
  1: 0.3,
  2: 0.52,
  3: 0.76,
  4: 1,
};

type LevelStyle = { backgroundColor: string; opacity: number };

type HoveredDay = { day: Contribution; x: number; y: number };

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function describeDay({ count, date }: Contribution) {
  const noun = count === 1 ? "contribution" : "contributions";

  return `${count} ${noun} on ${DATE_FORMAT.format(new Date(`${date}T00:00:00`))}`;
}

const CALENDAR_API = "https://github-contributions-api.jogruber.de/v4";
const EVENTS_API = "https://api.github.com/users";

type ApiDay = { date: string; count: number; level: number };
type PushEvent = {
  type: string;
  repo?: { name: string };
  payload?: { commits?: unknown[] };
};

async function fetchCalendar(login: string) {
  const res = await fetch(`${CALENDAR_API}/${login}?y=last`);

  if (!res.ok) return null;

  const days: ApiDay[] = (await res.json())?.contributions ?? [];

  if (!days.length) return null;

  // columns are weeks, so the first day has to be a sunday or every column shears
  const start = days.findIndex(
    (day) => new Date(`${day.date}T00:00:00Z`).getUTCDay() === 0,
  );

  return days.slice(start < 0 ? 0 : start).map<Contribution>((day) => ({
    date: day.date,
    count: day.count,
    level: Math.min(4, Math.max(0, day.level)) as ContributionLevel,
  }));
}

async function fetchRepos(login: string): Promise<RepoContribution[]> {
  const res = await fetch(`${EVENTS_API}/${login}/events/public?per_page=100`);

  if (!res.ok) return [];

  const events: PushEvent[] = await res.json();
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.type !== "PushEvent" || !event.repo) continue;
    const commits = event.payload?.commits?.length ?? 1;

    counts.set(event.repo.name, (counts.get(event.repo.name) ?? 0) + commits);
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, STACK_LIMIT)
    .map(([fullName, count]) => {
      const [owner, name] = fullName.split("/");

      return {
        name,
        count,
        href: `https://github.com/${fullName}`,
        // github has no repo logo, only an owner avatar, so own repos use the initial
        logo:
          owner.toLowerCase() === login.toLowerCase() ? undefined : (
            <img alt="" src={`https://github.com/${owner}.png?size=64`} />
          ),
      };
    });
}

function useGitHubUser(login?: string) {
  const [data, setData] = React.useState<{
    contributions: Contribution[];
    repos: RepoContribution[];
  }>();

  React.useEffect(() => {
    if (!login) return;
    let active = true;

    Promise.all([fetchCalendar(login), fetchRepos(login)])
      .then(([contributions, repos]) => {
        if (active && contributions) setData({ contributions, repos });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [login]);

  return data;
}

function emptyDays(weeks: number): Contribution[] {
  const today = new Date();

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(today);

    date.setDate(date.getDate() - (weeks * 7 - 1 - i));

    return {
      date: date.toISOString().slice(0, 10),
      count: 0,
      level: 0 as ContributionLevel,
    };
  });
}

function toScale(accent: string | string[]): LevelStyle[] {
  if (typeof accent === "string") {
    return LEVELS.map((level) => ({
      backgroundColor: accent,
      opacity: LEVEL_OPACITY[level],
    }));
  }

  const colors = accent.length > 4 ? accent : ["transparent", ...accent];

  return LEVELS.map((level) => {
    const color = colors[level] ?? colors.at(-1) ?? "transparent";

    return { backgroundColor: color, opacity: color === "transparent" ? 0 : 1 };
  });
}

function toWeeks(contributions: Contribution[]) {
  const weeks: Contribution[][] = [];

  for (let i = 0; i < contributions.length; i += 7) {
    weeks.push(contributions.slice(i, i + 7));
  }

  return weeks;
}

function useFittedColumns(cellSize: number, gap: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState<number>();

  useIsoLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;

    const measure = () =>
      setColumns(
        Math.max(1, Math.floor((el.clientWidth + gap) / (cellSize + gap))),
      );

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(el);

    return () => observer.disconnect();
  }, [cellSize, gap]);

  return [ref, columns] as const;
}

// 本地增补：formatDay / formatHeading / toggleLabels 三个可选 i18n 出口，缺省沿用上游英文。
export type FormatDay = (day: Contribution) => string;
export type FormatHeading = (total: number, year: number | null) => string;
export type ToggleLabels = { show: string; hide: string };

const Tooltip = ({
  hovered,
  reduceMotion,
  formatDay,
}: {
  hovered: HoveredDay;
  reduceMotion: boolean | null;
  formatDay: FormatDay;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [left, setLeft] = React.useState(hovered.x);

  useIsoLayoutEffect(() => {
    const half = (ref.current?.offsetWidth ?? 0) / 2;
    const edge = TOOLTIP_EDGE + half;

    setLeft(Math.min(Math.max(hovered.x, edge), window.innerWidth - edge));
  }, [hovered]);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left,
        top: hovered.y,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <motion.div
        ref={ref}
        animate={{ opacity: 1, scale: 1 }}
        className="whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-md"
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        transition={reduceMotion ? { duration: 0 } : TOOLTIP_FADE}
      >
        {formatDay(hovered.day)}
      </motion.div>
    </div>,
    document.body,
  );
};

const ContributionGrid = ({
  contributions,
  scale,
  cellSize,
  months,
  showMonths,
  label,
  reduceMotion,
  formatDay,
}: {
  contributions: Contribution[];
  scale: LevelStyle[];
  cellSize: number;
  months: number;
  showMonths: boolean;
  label: string;
  reduceMotion: boolean | null;
  formatDay: FormatDay;
}) => {
  const weeks = React.useMemo(() => toWeeks(contributions), [contributions]);
  const gap = gapFor(cellSize);
  const [ref, columns] = useFittedColumns(cellSize, gap);
  const [hovered, setHovered] = React.useState<HoveredDay>();

  const cap = Math.min(weeks.length, weeksFor(months));
  const visible = weeks.slice(-Math.min(cap, columns ?? cap));
  const sweepEnd = (visible.length - 1) * COLUMN_STAGGER + CELL_FADE.duration;

  const hover = (day: Contribution) => (event: React.PointerEvent) => {
    const cell = event.currentTarget.getBoundingClientRect();

    setHovered({ day, x: cell.left + cell.width / 2, y: cell.top });
  };

  return (
    <div
      ref={ref}
      aria-label={label}
      className="relative"
      data-slot="github-activity-grid"
      role="img"
    >
      {showMonths && (
        <motion.div
          animate={{ opacity: 1, filter: "blur(0px)" }}
          className="flex justify-center"
          initial={
            reduceMotion
              ? false
              : { opacity: 0, filter: `blur(${LABEL_BLUR}px)` }
          }
          style={{ gap, marginBottom: gap }}
          transition={{
            ...LABEL_REVEAL,
            delay: reduceMotion ? 0 : sweepEnd,
          }}
        >
          {toMonthLabels(visible).map((month, index) => (
            <div
              key={index}
              className="relative h-3 shrink-0"
              style={{ width: cellSize }}
            >
              {month && (
                <span className="absolute left-0 top-0 text-[10px] leading-none text-foreground/40">
                  {month}
                </span>
              )}
            </div>
          ))}
        </motion.div>
      )}

      <div
        className="flex justify-center overflow-hidden"
        style={{ gap }}
        onPointerLeave={() => setHovered(undefined)}
      >
        {visible.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col" style={{ gap }}>
            {week.map((day) => (
              <motion.div
                key={day.date}
                animate={{ opacity: 1, scale: 1 }}
                className="shrink-0 rounded-[3px] bg-foreground/[0.08]"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                style={{ width: cellSize, height: cellSize }}
                transition={{
                  ...CELL_FADE,
                  delay: reduceMotion ? 0 : weekIndex * COLUMN_STAGGER,
                }}
                onPointerEnter={hover(day)}
              >
                <div
                  className="h-full w-full rounded-[3px]"
                  style={scale[day.level] ?? scale[0]}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {hovered && (
          <Tooltip
            key="tooltip"
            formatDay={formatDay}
            hovered={hovered}
            reduceMotion={reduceMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Avatar = ({
  repo,
  layoutId,
  transition,
  className,
}: {
  repo: RepoContribution;
  layoutId: string;
  transition: Transition;
  className?: string;
}) => (
  <motion.span
    className={cn(
      "grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-default text-[11px] font-medium uppercase text-foreground/70 ring-2 ring-background",
      "[&_img]:size-full [&_img]:object-cover [&_svg]:size-full",
      className,
    )}
    layoutId={layoutId}
    transition={transition}
  >
    {repo.logo ?? repo.name.charAt(0)}
  </motion.span>
);

const RepoRow = ({
  repo,
  layoutId,
  transition,
}: {
  repo: RepoContribution;
  layoutId: string;
  transition: Transition;
}) => {
  const className =
    "flex items-center gap-3 rounded-xl mx-2 px-2 py-2 transition-colors hover:bg-foreground/5";

  const content = (
    <>
      <Avatar layoutId={layoutId} repo={repo} transition={transition} />
      <span className="flex-1 truncate text-sm text-foreground">
        {repo.name}
      </span>
      <span className="text-sm tabular-nums text-foreground/70">
        {repo.count}
      </span>
    </>
  );

  return repo.href ? (
    <a className={className} href={repo.href} rel="noreferrer" target="_blank">
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
};

const Chevron = ({
  open,
  transition,
}: {
  open: boolean;
  transition: Transition;
}) => (
  <motion.svg
    aria-hidden
    animate={{ rotate: open ? 180 : 0 }}
    className="size-7 text-muted"
    fill="none"
    initial={false}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    transition={transition}
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m16 10-4 4-4-4" />
  </motion.svg>
);

export type GitHubActivityProps = React.ComponentProps<"div"> & {
  username?: string;
  contributions?: Contribution[];
  repos?: RepoContribution[];
  year?: number;
  accent?: string | string[];
  cellSize?: number;
  months?: number;
  showMonths?: boolean;
  label?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 本地增补：热力图标题文案（缺省 `${total} contributions in ${year}`） */
  formatHeading?: FormatHeading;
  /** 本地增补：单日 tooltip 文案（缺省英文 `N contributions on <date>`） */
  formatDay?: FormatDay;
  /** 本地增补：展开 / 收起仓库列表按钮的 aria-label */
  toggleLabels?: ToggleLabels;
};

const defaultFormatHeading: FormatHeading = (total, year) =>
  `${total} contributions${year ? ` in ${year}` : ""}`;

const DEFAULT_TOGGLE_LABELS: ToggleLabels = {
  show: "Show top repositories",
  hide: "Hide top repositories",
};

const GitHubActivity = ({
  className,
  username,
  contributions: contributionsProp = [],
  repos: reposProp = [],
  year,
  accent = DEFAULT_ACCENT,
  cellSize = DEFAULT_CELL_SIZE,
  months = DEFAULT_MONTHS,
  showMonths = false,
  label = DEFAULT_LABEL,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  formatHeading = defaultFormatHeading,
  formatDay = describeDay,
  toggleLabels = DEFAULT_TOGGLE_LABELS,
  style,
  ...props
}: GitHubActivityProps) => {
  const reduceMotion = useReducedMotion();
  const uid = React.useId();
  const [openState, setOpenState] = React.useState(defaultOpen);

  const open = openProp ?? openState;
  const toggle = () => {
    if (openProp === undefined) setOpenState(!open);
    onOpenChange?.(!open);
  };

  const needsFetch = !contributionsProp.length || !reposProp.length;
  const fetched = useGitHubUser(needsFetch ? username : undefined);
  const placeholder = React.useMemo(
    () => (username ? emptyDays(weeksFor(months)) : []),
    [username, months],
  );

  const contributions = contributionsProp.length
    ? contributionsProp
    : (fetched?.contributions ?? placeholder);
  const repos = reposProp.length ? reposProp : (fetched?.repos ?? []);

  const scale = React.useMemo(() => toScale(accent), [accent]);
  const transition = reduceMotion ? { duration: 0 } : SPRING;
  const headerTransition = reduceMotion ? { duration: 0 } : HEADER_SPRING;
  const rowTransition = reduceMotion ? { duration: 0 } : ROW_SPRING;

  const kick = reduceMotion ? {} : { x: ROW_OFFSET, y: ROW_OFFSET };
  const listMotion = {
    initial: { opacity: 0, ...kick },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, ...kick },
  };

  const total = React.useMemo(
    () => contributions.reduce((sum, day) => sum + day.count, 0),
    [contributions],
  );

  const parsedYear = Number(contributions.at(-1)?.date.slice(0, 4));
  const displayYear = year ?? (Number.isFinite(parsedYear) ? parsedYear : null);
  const heading = formatHeading(total, displayYear);

  const gap = gapFor(cellSize);
  const columns = Math.min(
    Math.ceil(contributions.length / 7),
    weeksFor(months),
  );
  const width = Math.max(
    MIN_CARD_WIDTH,
    columns * (cellSize + gap) - gap + CARD_PADDING,
  );

  return (
    <div
      className={cn(
        "relative max-w-full overflow-hidden rounded-[28px] bg-surface p-4",
        repos.length > 0 && "pb-[76px]",
        className,
      )}
      data-slot="github-activity"
      style={{ width, ...style }}
      {...props}
    >
      <p className="mb-4 text-base font-medium text-foreground px-1.5">
        {heading}
      </p>

      <ContributionGrid
        cellSize={cellSize}
        contributions={contributions}
        formatDay={formatDay}
        label={heading}
        months={months}
        reduceMotion={reduceMotion}
        scale={scale}
        showMonths={showMonths}
      />

      {repos.length > 0 && (
        <motion.div
          layout
          className={cn(
            "absolute inset-x-3 bottom-3 overflow-hidden bg-surface/90 backdrop-blur-xl",
            open && "top-3",
          )}
          data-slot="github-activity-panel"
          data-state={open ? "open" : "closed"}
          id={`${uid}-panel`}
          style={{ borderRadius: 18 }}
          transition={transition}
        >
          <motion.div
            className="flex items-center justify-between gap-3 py-3 px-4"
            layout="position"
            transition={headerTransition}
          >
            <span className="truncate text-sm text-foreground">{label}</span>

            <div className="flex items-center gap-3">
              {!open && (
                <div className="flex items-center">
                  {repos.slice(0, STACK_LIMIT).map((repo, index) => (
                    <Avatar
                      key={index}
                      className="-ml-2 first:ml-0"
                      layoutId={`${uid}-${index}`}
                      repo={repo}
                      transition={transition}
                    />
                  ))}
                </div>
              )}

              <button
                aria-controls={`${uid}-panel`}
                aria-expanded={open}
                aria-label={open ? toggleLabels.hide : toggleLabels.show}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-secondary"
                type="button"
                onClick={toggle}
              >
                <Chevron open={open} transition={transition} />
              </button>
            </div>
          </motion.div>

          <AnimatePresence initial={false} mode="popLayout">
            {open && (
              <motion.ul
                key="list"
                layout="position"
                {...listMotion}
                className="px-0.5 pb-1"
                transition={rowTransition}
              >
                {repos.map((repo, index) => (
                  <li key={index}>
                    <RepoRow
                      layoutId={`${uid}-${index}`}
                      repo={repo}
                      transition={transition}
                    />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export { GitHubActivity };
export default GitHubActivity;
