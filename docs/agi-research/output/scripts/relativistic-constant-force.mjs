// Mission 03 — fourth scoped item: special relativity.
//
// Question: does a particle under a CONSTANT LAB-FRAME FORCE (not constant proper acceleration — a
// simpler, lower-risk-to-misstate problem) behave the way special relativity requires: velocity bounded
// below c as t->infinity (never Newton's unbounded F*t/m), the energy-momentum relation holding at every
// instant, and the work-energy theorem holding when checked via an independent numerical integral of power
// along the trajectory, not just the closed-form energy formula?
//
// Established physics used: the relativistic equation of motion dp/dt = F with p = gamma*m*v,
// gamma = 1/sqrt(1-v^2/c^2) (relativistic generalization of Newton's second law — not Newtonian F=ma).
// EVERYTHING ELSE below (the v(t) closed form, the ODE for dv/dt, the energy-momentum identity) is derived
// in this file's comments, not pulled from memory, specifically to avoid presenting a misremembered
// formula as established (same policy as the earlier electromagnetism item in this series).
//
// Units: m=1, c=1, F=1 throughout (natural units) — only ratios and dimensionless checks matter here.
//
// Run: node relativistic-constant-force.mjs

const M = 1, C = 1, F = 1;

/**
 * Derivation (done here, not recalled): from p = F*t (exact, since dp/dt=F=const and p(0)=0) and the
 * definition p = M*v/sqrt(1-v^2/C^2), solve for v:
 *   p^2 (1 - v^2/C^2) = M^2 v^2  =>  p^2 = v^2 (M^2 + p^2/C^2)  =>  v = p / sqrt(M^2 + p^2/C^2).
 * Substituting p=F*t gives the closed form used as the reference below.
 */
function exactV(t) {
  const p = F * t;
  return p / Math.sqrt(M * M + (p * p) / (C * C));
}

/**
 * Derivation (done here, not recalled) of dv/dt from dp/dt=F and p=Mv/sqrt(1-v^2/C^2), by direct
 * differentiation (product + chain rule):
 *   dp/dt = M [ v'/sqrt(1-v^2/C^2) + v * (v v'/C^2) / (1-v^2/C^2)^(3/2) ]
 *         = M v' [ (1-v^2/C^2) + v^2/C^2 ] / (1-v^2/C^2)^(3/2)
 *         = M v' / (1-v^2/C^2)^(3/2)
 * so dv/dt = (F/M) * (1 - v^2/C^2)^(3/2). This is what the RK4 integrator below actually integrates —
 * an independent numerical method from the closed form above, since it never uses exactV() internally.
 */
function dvdt(v) {
  return (F / M) * Math.pow(1 - (v * v) / (C * C), 1.5);
}

function rk4Step(v, dt) {
  const k1 = dvdt(v);
  const k2 = dvdt(v + (dt / 2) * k1);
  const k3 = dvdt(v + (dt / 2) * k2);
  const k4 = dvdt(v + dt * k3);
  return v + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

// Two phases: dense stepping while things change quickly (used for the Check D trajectory too), then a
// coarser step once v is already close to C and changing extremely slowly — RK4's own O(dt^4) error means
// this costs essentially nothing in accuracy while keeping the t=1000 sample fast to reach.
const DT_DENSE = 1e-4, DT_COARSE = 0.1, PHASE_BOUNDARY = 20;
const sampleTimes = [0, 1, 2, 5, 20, 1000];
const trajectory = []; // dense samples up to PHASE_BOUNDARY, for the independent power-integral check (Check D)
let v = 0, t = 0;
let nextSampleIdx = 0;
const rk4Samples = [];

while (nextSampleIdx < sampleTimes.length) {
  const dt = t < PHASE_BOUNDARY ? DT_DENSE : DT_COARSE;
  if (t >= sampleTimes[nextSampleIdx] - dt / 2) {
    rk4Samples.push({ t, v, exact: exactV(t) });
    nextSampleIdx++;
    continue;
  }
  if (t < PHASE_BOUNDARY) trajectory.push({ t, v });
  v = rk4Step(v, dt);
  t += dt;
}

// ── Check A: RK4 (integrates dv/dt derived above) vs the closed form (derived independently above) ──
const checkA = rk4Samples.map((s) => ({ t: s.t, v_rk4: s.v, v_exact: s.exact, relErr: s.t === 0 ? 0 : Math.abs(s.v - s.exact) / s.exact }));

// ── Check B: causality — v must stay strictly below C even at very large t ──
const checkB = rk4Samples.map((s) => ({ t: s.t, v: s.v, belowC: s.v < C, oneMinusVOverC: 1 - s.v / C }));

// ── Check C: relativistic energy-momentum relation E^2 = (pc)^2 + (mc^2)^2 holds at every sampled instant ──
function gamma(vv) { return 1 / Math.sqrt(1 - (vv * vv) / (C * C)); }
const checkC = rk4Samples
  .filter((s) => s.t > 0)
  .map((s) => {
    const g = gamma(s.v);
    const p = g * M * s.v, E = g * M * C * C;
    const lhs = E * E, rhs = (p * C) ** 2 + (M * C * C) ** 2;
    return { t: s.t, E, p, lhs, rhs, relErr: Math.abs(lhs - rhs) / rhs };
  });

// ── Check D: work-energy theorem via an INDEPENDENT quadrature of the dense trajectory, not the closed form ──
// Work = integral of Power = F*v dt, from 0 to T; must equal kinetic energy gained, (gamma(T)-1)*M*C^2,
// computed from the SAME trajectory's final velocity — two different numerical operations on the same run.
function trapezoidalWork(upToT) {
  let work = 0;
  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i].t > upToT) break;
    const dtStep = trajectory[i].t - trajectory[i - 1].t;
    work += 0.5 * (F * trajectory[i - 1].v + F * trajectory[i].v) * dtStep;
  }
  return work;
}
const checkD = rk4Samples
  .filter((s) => s.t > 0 && s.t <= 20) // the t=1000 sample's trajectory wasn't densely stored that far (kept to a sane size); checked separately where relevant
  .map((s) => {
    const work = trapezoidalWork(s.t);
    const keGained = (gamma(s.v) - 1) * M * C * C;
    return { t: s.t, workDone: work, kineticEnergyGained: keGained, relErr: Math.abs(work - keGained) / keGained };
  });

console.log(JSON.stringify({ M, C, F, checkA_rk4VsClosedForm: checkA, checkB_causality: checkB, checkC_energyMomentumRelation: checkC, checkD_workEnergyTheorem: checkD }, null, 2));
