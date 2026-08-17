// Segmented task progress bar — completed vs estimated sessions for the active
// task. Renders in Peek and ExpandedBody only, directly under the task line
// (ticket 03: the bar is task-adjacent, not dots-adjacent — it means nothing
// without the task it measures, and three of the five SessionDots call sites
// never name a task). The placement system is untouched by design.
//
// Design answers this file owns (ticket 07's deferred questions):
//
// 1. SEGMENT COUNT. One segment per estimated session, up to SEGMENT_CAP. Above
//    the cap the bar stops subdividing: it holds SEGMENT_CAP segments, each
//    standing for several sessions and filling fractionally. The cap is a
//    legibility floor, not a taste call — Peek's content width is 232px
//    (272 - 2×20 padding), so 12 segments are ~16px each and countable, while a
//    30-session estimate drawn one-per-session would be ~4.8px each: stippling,
//    a texture rather than a count, which throws away the only advantage the bar
//    has over the number it replaced. Switching to a continuous bar above the cap
//    was rejected — segmentation is what separates this from the timer's bar, and
//    a treatment that changes identity based on a number the user typed into the
//    estimate stepper is worse than one that degrades gracefully. The exact
//    figures are always one hover away.
//
// 2. OVERFLOW. The bar never grows past the estimate: at or beyond it, exactly
//    `estimateSessions` segments render, all filled. 4/4, 5/4, 9/4 and 40/4 are
//    one picture. The bar's claim is "you have done at least what you estimated",
//    and it does not quantify the overrun because two better voices already do —
//    the hover reveal carries the real figures, and ticket 18's stop plus ticket
//    19's controls (which replace this bar in its slot) are the actual signal at
//    the moment overrun starts to matter. It also makes the reading unambiguous
//    by construction: "N filled then M empty" can only ever mean N done of N+M
//    estimated, so an overrun can never be mistaken for work remaining.
//
// 3. HOVER REVEAL. Two layers in one grid cell with a CSS-only opacity swap,
//    copied from SessionDots + island.css: no React hover state, and the
//    container cannot resize under the pointer (MO-50).
//
// 4. COLOUR. The fill holds the *stable* accent (view.accentBase), not the live
//    view.accent. The live accent encodes what THIS BLOCK is doing (clay on a
//    break, amber in the final minute); a task at 3/5 does not become urgent
//    because the current block has 40 seconds left. Holding it steady is also what
//    makes "the bar persists unchanged through breaks" (ticket 03 §8) literally
//    true. Track: var(--il-track), same token as the timer bar.
//
// 5. VS THE TIMER'S CONTINUOUS BAR. Segmented not continuous; stable accent not
//    live accent; and never a full-width rail below the cap, because segments stop
//    growing at MAX_SEG_W. That last one is load-bearing rather than decorative:
//    the default estimate is 1 (tasks.ts emptyTasksState), and a single flex-grown
//    segment is a full-width rounded bar — the one case that could read as a
//    second continuous bar. Capped, a 1-session task is a short pill on the left.
//    In Peek the timer's bar has also moved to the card foot, below the time and
//    transport controls, so the two are no longer stacked at all.
//
// The slot is FIXED HEIGHT with a task and absent without one (ticket 03 §7), and
// is a flex row so ticket 19's two controls fit inside it without the slot
// growing to content — Peek is hover-revealed and a card that changes height
// under the pointer is how MO-50 happened.

/**
 * Height (px) of the bar's slot. Fixed rather than content-sized, and set by the
 * taller of the bar and ticket 19's two resume controls rather than by the bar
 * alone — 19 fits its buttons inside this, which is what makes the at-estimate
 * swap a pure crossfade (ticket 03 §7). 20px because the bar itself needs 11 (the
 * hover count's line box) and a 20px square is a usable hit target for those two
 * controls, which the app's own 16px `pipBtn` is on the small side of.
 */
export const TASK_BAR_SLOT_H = 20

/** Most segments drawn. See note 1. */
const SEGMENT_CAP = 12
const SEG_H = 5
const SEG_GAP = 3
/**
 * Widest a single segment gets, so a low-estimate bar is a short run of pills on
 * the left rather than one full-width rail. See note 5. 40px keeps a 5-segment
 * bar (212px including gaps) just short of Peek's 232px content width, so the bar
 * only reaches full width once it is unmistakably a comb.
 */
const MAX_SEG_W = 40

interface TaskProgressBarProps {
  completed: number
  estimate: number
  /** Stable (block-independent) accent — see note 4. */
  accent: string
  /** Prefers-reduced-motion: drops the fill transition. */
  rm: boolean
}

/**
 * Per-segment fill fractions, in order, each 0–1. Exported separately from the
 * component so the arithmetic can be driven without a DOM.
 *
 * Sessions-per-segment is exactly 1 whenever the estimate fits under the cap,
 * which makes every fraction 0 or 1 — the crisp, countable case that covers
 * essentially every real task. Fractions only appear above the cap.
 *
 * `completed` is clamped to the estimate: the bar does not grow or overfill past
 * it (note 2).
 */
export function taskBarSegments(completed: number, estimate: number): number[] {
  const est = Math.max(1, Math.floor(estimate))
  const done = Math.min(Math.max(0, Math.floor(completed)), est)
  const count = Math.min(est, SEGMENT_CAP)
  const sessionsPerSegment = est / count

  return Array.from({ length: count }, (_, i) => {
    const filled = (done - i * sessionsPerSegment) / sessionsPerSegment
    return Math.max(0, Math.min(1, filled))
  })
}

export function TaskProgressBar({
  completed,
  estimate,
  accent,
  rm,
}: TaskProgressBarProps) {
  const segments = taskBarSegments(completed, estimate)
  const fillTransition = rm ? undefined : 'width .35s ease'
  const label = estimate === 1 ? 'session' : 'sessions'

  return (
    <div
      className="il-task-bar"
      style={{
        display: 'grid',
        alignItems: 'center',
        height: TASK_BAR_SLOT_H,
      }}
    >
      <div
        className="il-task-bar-layer"
        style={{ gridArea: '1 / 1', display: 'flex', alignItems: 'center' }}
        role="img"
        aria-label={`${completed} of ${estimate} ${label} complete`}
      >
        {segments.map((fill, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              maxWidth: MAX_SEG_W,
              height: SEG_H,
              borderRadius: 999,
              background: 'var(--il-track)',
              overflow: 'hidden',
              marginLeft: i === 0 ? 0 : SEG_GAP,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${fill * 100}%`,
                background: accent,
                borderRadius: 999,
                transition: fillTransition,
              }}
            />
          </div>
        ))}
      </div>
      {/* Hover layer — the only place the exact numbers appear in the island
          while the pref is on (ticket 03 §4), so it carries the unit word the
          way the task rows do, and it is the one readout that still tells the
          truth about an overrun (35/30). Hidden from assistive tech: the bar's
          own aria-label already says it. */}
      <div
        className="il-task-count-layer"
        aria-hidden="true"
        style={{
          gridArea: '1 / 1',
          display: 'inline-flex',
          alignItems: 'baseline',
          justifySelf: 'start',
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            color: accent,
            lineHeight: 1,
          }}
        >
          {completed}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: 'var(--il-body)',
            lineHeight: 1,
          }}
        >
          /{estimate}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 8.5,
            color: 'var(--il-muted)',
            lineHeight: 1,
            marginLeft: 3,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
