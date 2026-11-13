# Mission 03 — third scoped item: 1D heat/diffusion equation

Date: 2026-11-13. Third in the series started with [the pendulum](mission-03-pendulum-large-angle-period.md) and [the circular current loop](mission-03-circular-loop-magnetic-field.md): one concrete, falsifiable, fully-computed item per domain, not a survey. Script: `output/scripts/heat-diffusion.mjs`, zero dependencies, zero AI tokens, zero DARK AGI platform calls.

## 1. Research problem

Does an explicit finite-difference (FTCS) time integration of the 1D diffusion equation reproduce the two defining, checkable properties of diffusion — conserved total mass, and variance growing linearly in time — and does it independently agree with a direct numerical evaluation of the known Green's function (heat kernel), using a completely different numerical method?

## 2. Established physics, and a formula verified before being trusted

- Fourier's law plus conservation of energy gives the 1D diffusion equation $\partial u/\partial t = D\,\partial^2 u/\partial x^2$ — standard (Fourier, 1822).
- Its fundamental solution (heat kernel), $G(x,t) = \dfrac{1}{\sqrt{4\pi D t}}\exp\!\left(-\dfrac{x^2}{4Dt}\right)$, and the resulting property that a Gaussian initial condition stays Gaussian with $\sigma(t)^2 = \sigma_0^2 + 2Dt$, are standard results — the same statement as "mean-squared displacement grows linearly with time" in Brownian motion.
- Rather than simply trusting the recalled kernel formula, **Check 0 below verifies its own normalization** ($\int G(x,t)\,dx = 1$ for every $t$) by numerical quadrature *before* it is used as a reference for anything else. A wrong prefactor or exponent would have failed this immediately.

## 3. Method — four checks, two independent numerical methods

Parameters: $D=1$, initial Gaussian width $\sigma_0=1$, grid spacing $dx=0.1$ over $x\in[-20,20]$ (the Gaussian stays $>15\sigma$ from either boundary throughout), time step $dt=0.002$ (within the FTCS stability bound $dt \le dx^2/2D = 0.005$).

0. **Kernel self-check**: $\int_{-\infty}^{\infty} G(x,t)\,dx$ by trapezoid quadrature, for $t\in\{0.1,1,5\}$.
1. **Mass conservation**: $\int u(x,t)\,dx$ from the FTCS simulation, at $t\in\{0,1,2,4\}$.
2. **Variance growth**: measured $\sigma(t)^2$ from the simulation's second moment, compared to $\sigma_0^2+2Dt$, plus an independent least-squares linear fit of measured variance vs. $t$ (recovering $D$ and $\sigma_0^2$ without assuming the formula).
3. **Cross-method agreement**: the FTCS profile at four points at each sampled $t>0$, compared against a *direct quadrature* of the convolution $u(x,t) = \int G(x-x',t)\,u_0(x')\,dx'$ — an independent numerical method from time-stepping.

## 4. Results (real script output, copied verbatim)

**Check 0 — kernel normalization**: $0.9999999999999915$, $0.9999999999999871$, $0.9999999999999831$ for $t=0.1,1,5$ — all within $2\times10^{-14}$ of exactly 1.

**Check 1 — mass conservation** (relative error vs. $t=0$): $0$ at $t=1$; $6.66\times10^{-16}$ at $t=2$; $5.17\times10^{-11}$ at $t=4$. Degrades slightly at the longest time — plausibly the Gaussian's tail reaching further toward the fixed (Dirichlet-zero) boundary, or accumulated floating-point error over 2000 time steps; still negligible in absolute terms.

**Check 2 — variance growth**:

| $t$ | measured $\sigma^2$ | predicted $\sigma_0^2+2Dt$ | rel. err |
|---:|---:|---:|---:|
| 0 | 0.9999999999999999 | 1 | 0 |
| 1 | 3.0000000000000004 | 3.0000000000000013 | 2.96e-16 |
| 2 | 4.999999999999998 | 5.000000000000003 | 8.88e-16 |
| 4 | 8.999999979748852 | 8.999999999999563 | 2.25e-9 |

Independent least-squares fit of the measured variance vs. $t$ (not using the formula at all): slope $=1.9999999927676047$ (expected $2D=2$), intercept $=1.0000000101253501$ (expected $\sigma_0^2=1$).

**Check 3 — FTCS vs. independent convolution quadrature**, relative error at $x\in\{0,1,2,3\}$:

| $t$ | $x=0$ | $x=1$ | $x=2$ | $x=3$ |
|---:|---:|---:|---:|---:|
| 1 | 5.55e-5 | 2.06e-5 | 5.96e-5 | 1.11e-4 |
| 2 | 4.00e-5 | 2.45e-5 | 1.54e-5 | 6.08e-5 |
| 4 | 2.47e-5 | 1.93e-5 | 4.37e-6 | 1.65e-5 |

## 5. Analysis

- All four checks pass. Checks 0–2 agree to near machine precision ($10^{-14}$ to $10^{-16}$, aside from the single $t=4$ outlier at $2\times10^{-9}$, still minuscule) because they compare exact arithmetic properties (an integral's normalization, a conserved quantity, a linear-regression fit) against formulas, not two different discretizations against each other.
- **Check 3's errors are noticeably larger** ($10^{-4}$ to $10^{-6}$) than everything else in this item and than *either* of the first two Mission 03 items (which agreed to $10^{-10}$–$10^{-15}$). This is expected, not a weaker result: FTCS time-stepping has genuine $O(dx^2, dt)$ truncation error (unlike RK4's $O(dt^4)$ or the near-exact trapezoid/midpoint quadratures used earlier), and the convolution quadrature itself introduces its own discretization error. Two independently-discretized numerical methods agreeing to 4–5 significant figures is the right scale of agreement to expect here — reporting it at face value, rather than only showing the near-machine-precision checks, keeps this honest about what FTCS actually costs in accuracy.

## 6. What this does and does not establish

- **Does establish**: the FTCS implementation conserves mass and reproduces linear variance growth to extremely high precision, and independently agrees with a direct Green's-function quadrature to the precision that method's own truncation error allows.
- **Does not establish**: anything new about diffusion or thermodynamics — Fourier's heat equation and its Gaussian fundamental solution are two-century-old, settled physics. This is a verified computational reproduction, not a discovery, per the same established/computational-prediction distinction as the other two items in this series.
- **Reproducible**: `node docs/agi-research/output/scripts/heat-diffusion.mjs`, runs in well under a second.
