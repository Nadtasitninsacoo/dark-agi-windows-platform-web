// Mission 03 — third scoped item: thermodynamics / diffusion.
//
// Question: does an explicit finite-difference time integration of the 1D heat/diffusion equation
// reproduce the two defining, checkable properties of diffusion (mass conservation; variance growing
// linearly in time), and does it independently agree with a direct numerical evaluation of the known
// Green's function (heat kernel) at several times — using a different numerical method entirely?
//
// Established physics used:
//   - Fourier's law + conservation of energy/mass gives the diffusion equation: du/dt = D * d2u/dx2.
//   - Its fundamental solution (heat kernel) for a point source is Gaussian: G(x,t) = exp(-x^2/(4*D*t)) /
//     sqrt(4*pi*D*t). I do NOT simply trust this from memory: Check 0 below verifies its normalization
//     (integral over all x must equal 1 for every t) numerically before it is used as a reference at all.
//   - A Gaussian initial condition convolved with this kernel stays Gaussian with variance sigma(t)^2 =
//     sigma0^2 + 2*D*t — a standard, low-risk-to-misstate property of diffusion (this is the same
//     statement as "mean squared displacement grows linearly with time" in Brownian motion), checked here
//     against the independently-run finite-difference simulation rather than assumed to match it.
//
// Run: node heat-diffusion.mjs

const D = 1; // diffusion coefficient
const SIGMA0 = 1; // initial Gaussian width
const DX = 0.1;
const L = 40; // domain [-L/2, L/2], gaussian stays >15 sigma from the boundary throughout
const NX = Math.round(L / DX) + 1;
const DT = 0.002; // FTCS stability needs dt <= dx^2/(2D) = 0.005; margin for safety
const xAt = (i) => -L / 2 + i * DX;

function gaussian(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

// ── Check 0: does the recalled heat-kernel formula even normalize to 1? (verified before being trusted) ──
function heatKernel(x, t) {
  return Math.exp(-(x * x) / (4 * D * t)) / Math.sqrt(4 * Math.PI * D * t);
}
function trapezoid(f, a, b, n) {
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) sum += f(a + i * h);
  return sum * h;
}
const kernelNormalizationChecks = [0.1, 1, 5].map((t) => ({ t, integral: trapezoid((x) => heatKernel(x, t), -50 * Math.sqrt(t), 50 * Math.sqrt(t), 200000) }));

// ── FTCS finite-difference time-stepping of du/dt = D * d2u/dx2, Dirichlet u=0 at both far boundaries ──
let u = Array.from({ length: NX }, (_, i) => gaussian(xAt(i), SIGMA0));
const r = (D * DT) / (DX * DX);

function mass(arr) {
  let m = 0;
  for (let i = 0; i < arr.length; i++) m += arr[i] * DX;
  return m;
}
function variance(arr) {
  let m0 = 0, m2 = 0;
  for (let i = 0; i < arr.length; i++) {
    const x = xAt(i);
    m0 += arr[i] * DX;
    m2 += x * x * arr[i] * DX;
  }
  return m2 / m0; // mean is 0 by construction (symmetric initial condition, symmetric scheme)
}

const sampleTimes = [0, 1, 2, 4];
const samples = [];
let t = 0, nextSampleIdx = 0;
const massAtStart = mass(u);

while (nextSampleIdx < sampleTimes.length) {
  if (t >= sampleTimes[nextSampleIdx] - 1e-9) {
    samples.push({ t, mass: mass(u), variance: variance(u), profile: u.slice() });
    nextSampleIdx++;
    continue;
  }
  const next = u.slice();
  for (let i = 1; i < NX - 1; i++) next[i] = u[i] + r * (u[i + 1] - 2 * u[i] + u[i - 1]);
  next[0] = 0; next[NX - 1] = 0;
  u = next;
  t += DT;
}

// ── Check 1: mass conservation ──
const massConservation = samples.map((s) => ({ t: s.t, mass: s.mass, relErrVsStart: Math.abs(s.mass - massAtStart) / massAtStart }));

// ── Check 2: variance grows linearly, slope should be 2D ──
const varianceCheck = samples.map((s) => ({ t: s.t, measuredVariance: s.variance, predicted: SIGMA0 * SIGMA0 + 2 * D * s.t, relErr: s.t === 0 ? 0 : Math.abs(s.variance - (SIGMA0 * SIGMA0 + 2 * D * s.t)) / (SIGMA0 * SIGMA0 + 2 * D * s.t) }));
// linear fit of variance vs t (least squares) across the t>0 samples, to recover D independently of the formula above
const fitPts = samples.filter((s) => s.t > 0).map((s) => [s.t, s.variance]);
const n = fitPts.length, sumT = fitPts.reduce((a, [tt]) => a + tt, 0), sumV = fitPts.reduce((a, [, v]) => a + v, 0);
const sumTT = fitPts.reduce((a, [tt]) => a + tt * tt, 0), sumTV = fitPts.reduce((a, [tt, v]) => a + tt * v, 0);
const fittedSlope = (n * sumTV - sumT * sumV) / (n * sumTT - sumT * sumT); // should be ~2D
const fittedIntercept = (sumV - fittedSlope * sumT) / n; // should be ~sigma0^2

// ── Check 3: FD profile vs. an INDEPENDENT numerical method — direct convolution of the initial Gaussian with the heat kernel, by quadrature ──
function convolutionAt(x, t, n = 4000, halfWidth = 30) {
  const h = (2 * halfWidth) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const xp = -halfWidth + i * h;
    const w = i === 0 || i === n ? 0.5 : 1;
    sum += w * gaussian(xp, SIGMA0) * heatKernel(x - xp, t);
  }
  return sum * h;
}
const convolutionCheck = samples
  .filter((s) => s.t > 0)
  .map((s) => {
    const testXs = [0, 1, 2, 3];
    const points = testXs.map((x) => {
      const fd = s.profile[Math.round((x + L / 2) / DX)];
      const conv = convolutionAt(x, s.t);
      return { x, fd, conv, relErr: Math.abs(fd - conv) / conv };
    });
    return { t: s.t, points };
  });

console.log(JSON.stringify({
  D, SIGMA0, DX, DT, L,
  check0_kernelNormalization: kernelNormalizationChecks,
  check1_massConservation: massConservation,
  check2_varianceLinearGrowth: { predictedFormula: varianceCheck, leastSquaresFit: { fittedSlope, expectedSlope: 2 * D, fittedIntercept, expectedIntercept: SIGMA0 * SIGMA0 } },
  check3_fdVsIndependentConvolutionQuadrature: convolutionCheck,
}, null, 2));
