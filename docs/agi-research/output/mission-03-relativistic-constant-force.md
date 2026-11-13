# Mission 03 — fourth scoped item: special relativity (constant lab-frame force)

Date: 2026-11-13. Fourth in the series after [mechanics](mission-03-pendulum-large-angle-period.md), [electromagnetism](mission-03-circular-loop-magnetic-field.md) and [thermodynamics](mission-03-heat-diffusion.md). Script: `output/scripts/relativistic-constant-force.mjs`, zero dependencies, zero AI tokens, zero DARK AGI platform calls.

## 1. Research problem

Under a **constant lab-frame force** (deliberately not constant *proper* acceleration — the "relativistic rocket" problem — which needs the rapidity formalism and is more memorable-formula-risk than this one), does a particle's velocity stay bounded below $c$ as $t\to\infty$ (unlike Newtonian mechanics, where $v=Ft/m$ diverges), does the relativistic energy-momentum relation hold throughout, and does the work-energy theorem hold when checked by an independent numerical integral of power along the trajectory, not just by plugging into the closed-form energy formula?

## 2. Established physics used, and everything else derived here (not recalled)

The only formula trusted as "established" is the relativistic generalization of Newton's second law, $dp/dt = F$ with $p=\gamma m v$, $\gamma=1/\sqrt{1-v^2/c^2}$ — low risk to misstate, a single well-known definition. Both of the following are **derived in the script's own comments**, step by step, rather than recalled as finished formulas, for the same reason as the electromagnetism item in this series (avoiding a misremembered formula presented as settled fact):

- **Closed-form velocity**: since $dp/dt=F$ with $p(0)=0$ gives exactly $p(t)=Ft$, solving $p=mv/\sqrt{1-v^2/c^2}$ for $v$ gives $v(t) = \dfrac{Ft}{\sqrt{m^2+(Ft/c)^2}}$.
- **The ODE actually integrated**: differentiating $p=mv/\sqrt{1-v^2/c^2}$ with respect to $t$ and simplifying gives $dp/dt = m\gamma^3\,dv/dt$, so $dv/dt = (F/m)(1-v^2/c^2)^{3/2}$ — this is what the RK4 integrator below actually steps, and it never calls the closed-form function, making the two genuinely independent checks of the same physics.

Units: $m=c=F=1$ throughout (only ratios and dimensionless checks matter).

## 3. Method — four checks

- **A**: RK4 integration of the derived ODE vs. the derived closed form, at $t\in\{0,1,2,5,20,1000\}$.
- **B**: causality — $v$ must stay strictly below $c$ even at $t=1000$ (deep relativistic regime).
- **C**: the relativistic energy-momentum relation $E^2=(pc)^2+(mc^2)^2$, checked at every sampled instant using RK4's own $v(t)$ to compute $E=\gamma mc^2$ and $p=\gamma mv$ — this is an algebraic identity of $\gamma$ itself, so any violation would mean a coding bug, not new physics.
- **D**: the work-energy theorem, checked by a **third, independent numerical method**: trapezoidal quadrature of $\int_0^T F\,v(t)\,dt$ along RK4's own dense trajectory, compared against the kinetic energy $(\gamma(T)-1)mc^2$ computed directly from RK4's final velocity — two different numerical operations on the same run, not the closed form at all.

(Two integration step sizes were used purely for runtime: $dt=10^{-4}$ up to $t=20$ where $v$ changes quickly, $dt=0.1$ beyond that where $v$ is already within $10^{-3}$ of $c$ and changing extremely slowly — RK4's $O(dt^4)$ local error means this costs essentially nothing in accuracy, confirmed by Check A's own numbers at $t=1000$ below.)

## 4. Results (real script output, copied verbatim)

**Check A — RK4 vs. closed form:**

| $t$ | $v$ (RK4) | $v$ (closed form) | rel. err |
|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 |
| 1 | 0.7071067811865462 | 0.7071067811865144 | 4.51e-14 |
| 2 | 0.894427190999913 | 0.8944271909998976 | 1.71e-14 |
| 5 | 0.9805806756909231 | 0.9805806756909328 | 9.85e-15 |
| 20 | 0.9987523388778485 | 0.9987523388778405 | 8.00e-15 |
| 1000 | 0.999999500000475 | 0.999999500000475 | **0** |

**Check B — causality:** $v$ stays strictly below $c=1$ at every sampled time, including $t=1000$ where $1-v/c = 4.9999953\times10^{-7}$ — closer and closer to $c$, never reaching it.

**Check C — energy-momentum relation**, $E^2$ vs. $(pc)^2+(mc^2)^2$: relative error $0$ at $t=1,2,5$; $1.42\times10^{-16}$ at $t=20$; $1.16\times10^{-16}$ at $t=1000$ — machine precision throughout.

**Check D — work-energy theorem** (independent quadrature vs. direct formula):

| $t$ | work done (quadrature) | KE gained (formula) | rel. err |
|---:|---:|---:|---:|
| 1 | 0.4142135618343455 | 0.4142135623730925 | 1.30e-9 |
| 2 | 1.2360679767408562 | 1.236067977499761 | 6.14e-10 |
| 5 | 4.09901951276731 | 4.099019513593169 | 2.01e-10 |
| 20 | 19.02498439363433 | 19.02498439453172 | 4.72e-11 |

## 5. Analysis

- Checks A–C agree to machine precision ($10^{-14}$ to $0$), as expected for an RK4 integration of a smooth problem plus an exact algebraic identity.
- Check D's agreement ($10^{-9}$ to $10^{-11}$) is visibly weaker than A–C, and that is expected, not a problem: trapezoidal quadrature has $O(dt^2)$ error, and with $dt=10^{-4}$ that lands right around $10^{-8}$–$10^{-10}$, matching what was observed. Unlike the heat-diffusion item, this wasn't surprising going in — it is reported anyway, for the same reason: a result that happens to confirm expectations still needs to be the one actually computed, not assumed.
- **No unexpected finding this time**, unlike the electromagnetism item's roundoff-accumulation surprise or the heat-diffusion item's boundary-effect note. I'm stating that plainly rather than manufacturing a "finding" where the numbers simply behaved as the error analysis predicted — this series isn't trying to find a surprise in every item.

## 6. What this does and does not establish

- **Does establish**: a from-scratch RK4 integration of the relativistic equation of motion (for a constant lab-frame force) matches an independently-derived closed form to near machine precision, respects the relativistic speed limit at $t=1000$ (deep into the regime where Newtonian mechanics would already predict $v>c$, specifically $v_{Newton}=Ft/m=1000 \gg c=1$ here), and satisfies both the energy-momentum relation and the work-energy theorem via a numerical method independent of the closed form.
- **Does not establish**: anything new about relativity. This is Einstein, 1905 — settled physics for well over a century. Everything here is a verified computational reproduction, consistent with the same established/computational-prediction distinction used throughout this series.
- **Reproducible**: `node docs/agi-research/output/scripts/relativistic-constant-force.mjs`, well under a second.
