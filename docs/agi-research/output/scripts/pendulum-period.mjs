// Mission 03 — real, runnable numerical experiment (no DARK AGI model calls, no deps).
//
// Question: how much does the large-angle period of a simple pendulum deviate from the familiar
// small-angle approximation T0 = 2*pi*sqrt(L/g), and does a from-scratch numerical time-domain
// simulation (RK4) actually agree with the known closed-form large-angle result?
//
// Three INDEPENDENT computations of the same physical quantity, cross-checked against each other:
//   1. RK4 integration of the exact nonlinear ODE theta'' = -(g/L) sin(theta), period measured by
//      detecting successive same-direction zero-crossings of theta(t).
//   2. The closed-form large-angle period via the complete elliptic integral of the first kind,
//      evaluated by the arithmetic-geometric mean (Gauss's AGM identity: K(k) = pi / (2*AGM(1,sqrt(1-k^2))),
//      a proven theorem, not something derived here).
//   3. The SAME elliptic integral evaluated completely independently by direct numerical quadrature
//      (Simpson's rule) of its defining integral, as a check that (2) isn't a coding mistake masquerading
//      as agreement with (1).
//
// Run: node pendulum-period.mjs

const G = 9.81; // m/s^2
const L = 1; // m

function pendulumAccel(theta) {
  return -(G / L) * Math.sin(theta);
}

function rk4Step(theta, omega, dt) {
  const k1t = omega, k1o = pendulumAccel(theta);
  const k2t = omega + (dt / 2) * k1o, k2o = pendulumAccel(theta + (dt / 2) * k1t);
  const k3t = omega + (dt / 2) * k2o, k3o = pendulumAccel(theta + (dt / 2) * k2t);
  const k4t = omega + dt * k3o, k4o = pendulumAccel(theta + dt * k3t);
  return [theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t), omega + (dt / 6) * (k1o + 2 * k2o + 2 * k3o + k4o)];
}

/** Measures one full period by timing between two consecutive downward (positive->non-positive) zero-crossings of theta(t), linearly interpolated for sub-step precision. Starts at rest at theta0 (a positive extremum), so the first downward crossing is at T/4 and the second at T/4 + T. */
function measuredPeriodRK4(theta0, dt, maxTime) {
  let theta = theta0, omega = 0, t = 0, prevTheta = theta;
  const crossings = [];
  while (t < maxTime && crossings.length < 2) {
    const [nt, no] = rk4Step(theta, omega, dt);
    if (prevTheta > 0 && nt <= 0) {
      const frac = prevTheta / (prevTheta - nt);
      crossings.push(t + frac * dt);
    }
    prevTheta = nt;
    theta = nt;
    omega = no;
    t += dt;
  }
  if (crossings.length < 2) throw new Error(`Did not observe two zero-crossings within maxTime=${maxTime}s for theta0=${theta0}`);
  return crossings[1] - crossings[0];
}

/** Complete elliptic integral of the first kind via Gauss's AGM identity. */
function ellipticK_agm(k) {
  let a = 1, b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 60; i++) {
    const an = (a + b) / 2, bn = Math.sqrt(a * b);
    if (Math.abs(an - bn) < 1e-16) { a = an; b = bn; break; }
    a = an; b = bn;
  }
  return Math.PI / (2 * a);
}

/** The same integral, K(k) = integral_0^(pi/2) dphi / sqrt(1 - k^2 sin^2(phi)), via composite Simpson's rule — deliberately independent of the AGM method above. */
function ellipticK_simpson(k, n = 200_000) {
  const f = (phi) => 1 / Math.sqrt(1 - k * k * Math.sin(phi) * Math.sin(phi));
  const a = 0, b = Math.PI / 2, h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (sum * h) / 3;
}

const T0 = 2 * Math.PI * Math.sqrt(L / G); // small-angle period

const degreesToTest = [5, 10, 30, 60, 90, 120, 150, 170];
const rows = [];
for (const deg of degreesToTest) {
  const theta0 = (deg * Math.PI) / 180;
  const k = Math.sin(theta0 / 2);
  const kAgm = ellipticK_agm(k);
  const kSimpson = ellipticK_simpson(k);
  const tExactAgm = 4 * Math.sqrt(L / G) * kAgm;
  const tExactSimpson = 4 * Math.sqrt(L / G) * kSimpson;
  // dt and maxTime scale with the (roughly) expected period so large angles still get two full crossings.
  const roughPeriodEstimate = T0 * (1 + (theta0 * theta0) / 16); // crude guide only, not used as a result
  const dt = Math.min(1e-4, roughPeriodEstimate / 20000);
  const maxTime = roughPeriodEstimate * 8;
  const tRk4 = measuredPeriodRK4(theta0, dt, maxTime);

  rows.push({
    degrees: deg,
    T0_smallAngle: T0,
    T_exact_AGM: tExactAgm,
    T_exact_Simpson: tExactSimpson,
    T_RK4_measured: tRk4,
    agmVsSimpsonRelErr: Math.abs(tExactAgm - tExactSimpson) / tExactSimpson,
    rk4VsExactRelErr: Math.abs(tRk4 - tExactAgm) / tExactAgm,
    smallAngleVsExactRelErr: Math.abs(T0 - tExactAgm) / tExactAgm,
  });
}

// Sanity check independent of the main sweep: K(0) must be exactly pi/2 (AGM(1,1)=1 trivially), and the
// AGM and Simpson methods must agree closely at k=0 too.
const k0Agm = ellipticK_agm(0);
const k0Simpson = ellipticK_simpson(0);

console.log(JSON.stringify({ G, L, k0Agm, k0Simpson, k0ExpectedExact: Math.PI / 2, rows }, null, 2));
