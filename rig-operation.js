// A short display cycle, independent of frame rate. The mast stays fixed;
// the top drive feeds the rotating pipe, then hoists back to its starting point.
export const RIG_CYCLE_DURATION = 10.6;
const POWER_UP = .6, DRILL_END = 7.6;
const ease = t => .5 - Math.cos(Math.PI * t) * .5;

export function rigCyclePose(seconds) {
  const time = Math.max(0, Math.min(RIG_CYCLE_DURATION, seconds));
  const drilling = Math.max(0, Math.min(1, (time - POWER_UP) / (DRILL_END - POWER_UP)));
  const returning = Math.max(0, Math.min(1, (time - DRILL_END) / (RIG_CYCLE_DURATION - DRILL_END)));
  return {
    travel: ease(drilling) * (1 - ease(returning)),
    rotation: drilling * Math.PI * 20,
    progress: time / RIG_CYCLE_DURATION,
    phase: time >= RIG_CYCLE_DURATION ? 'Cycle complete' : time >= DRILL_END ? 'Hoisting back up' : time >= POWER_UP ? 'Drilling' : 'Powering up',
  };
}
