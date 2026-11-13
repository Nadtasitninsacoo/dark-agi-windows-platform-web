# Mission 03 — second scoped item: magnetic field of a circular current loop

Date: 2026-11-13. Companion to [mission-03-pendulum-large-angle-period.md](mission-03-pendulum-large-angle-period.md); same approach — one concrete, falsifiable, fully-computed item rather than a shallow survey. Script: `output/scripts/circular-loop-field.mjs`, zero dependencies, zero AI tokens, zero DARK AGI platform calls.

## 1. Research problem

Does a from-scratch numerical integration of the Biot-Savart law for a circular current loop reproduce the loop's known on-axis field, and — for the off-axis field, where I deliberately avoid relying on a complex closed-form formula recalled from memory — does the computed field satisfy the physical laws any valid magnetic field must satisfy?

## 2. Why I avoided the usual "exact off-axis formula" approach

The standard textbook result for a loop's off-axis field involves the complete elliptic integrals $K(k)$ and $E(k)$ in a multi-term expression with several easy-to-transpose signs and factors. I am not confident I can reproduce that exact formula from memory without risk of a subtle error, and presenting a misremembered formula as "the established result" would be exactly the failure mode the Master Directive warns against. Instead, I used only:

- **The Biot-Savart law itself**, $d\vec B = \dfrac{\mu_0 I}{4\pi}\dfrac{d\vec l \times \hat r}{r^2}$ — a simple, low-risk-to-misstate fundamental law, integrated numerically around the loop.
- **An on-axis closed form I derive here, step by step**, as the one formula I do rely on (shown in the script's own comments and reproduced below), so a reader can check my derivation rather than take a recalled formula on faith.
- **Two general physical laws that must hold for *any* valid magnetic field**, used as independent checks rather than a specific-to-this-geometry formula: continuity, and $\nabla\cdot\vec B=0$ (no magnetic monopoles).

## 3. On-axis closed form (derived, not recalled)

By the loop's axial symmetry, every current element is the same distance $r=\sqrt{A^2+z^2}$ from an on-axis point, and by symmetry only the component of $d\vec B$ along the axis survives the integral around the loop; that component is $dB_z = dB\sin\theta$ with $\sin\theta = A/r$. Integrating around the full circumference $2\pi A$ with $r$ constant:
$$B_z(z) = \frac{\mu_0 I}{4\pi}\cdot\frac{1}{r^2}\cdot\frac{A}{r}\cdot 2\pi A = \frac{\mu_0 I A^2}{2(A^2+z^2)^{3/2}}$$

This is the formula `onAxisBzAnalytic()` computes, and the only "established result" this item trusts a specific algebraic form for.

## 4. Method — three checks, all against the same numerical Biot-Savart integrator (midpoint rule, loop radius $A=1\,\text{m}$, $I=1\,\text{A}$)

1. **On-axis agreement + convergence**: compare the integrator's $B_z$ on-axis against the derived formula at $z\in\{0,0.3,1,3\}$, for segment counts $N\in\{100,1000,10000,100000\}$.
2. **Continuity off-axis → on-axis**: evaluate the general (on- or off-axis) integrator at $\rho=10^{-4}\,\text{m}$ (just off the axis) and compare to the on-axis formula at the same $z$.
3. **$\nabla\cdot\vec B=0$ at a genuinely off-axis point** $(\rho,z)=(0.3,0.4)$: numerically integrate $\vec B\cdot\hat n\,dA$ over all six faces of a small cube ($9\times9$ grid per face) centered there and check the net flux is zero relative to the field's own scale.

## 5. Results (real script output, copied verbatim; full JSON in the script's own run)

**Check 1 — on-axis vs. the derived formula**, relative error by segment count:

| $z$ (m) | Formula $B_z$ (T) | $N{=}100$ | $N{=}1000$ | $N{=}10000$ | $N{=}100000$ |
|---:|---:|---:|---:|---:|---:|
| 0 | 6.283185307179586e-7 | 2.02e-15 | 2.14e-14 | 3.27e-14 | 1.19e-12 |
| 0.3 | 5.521284442322882e-7 | 1.92e-16 | 6.52e-15 | 5.04e-14 | 3.61e-13 |
| 1 | 2.2214414690791827e-7 | 9.53e-16 | 1.07e-15 | 1.02e-13 | 1.12e-12 |
| 3 | 1.9869176531592197e-8 | 9.99e-16 | 1.67e-16 | 8.89e-14 | 1.75e-12 |

**Check 2 — continuity** at $z=0.5$: on-axis formula gives $4.495881427866064\times10^{-7}\,\text{T}$; the integrator at $\rho=10^{-4}\,\text{m}$, same $z$, gives $4.4958814278660305\times10^{-7}\,\text{T}$ — relative error $7.42\times10^{-15}$.

**Check 3 — divergence-free** at $(\rho,z)=(0.3,0.4)$: field there is $\vec B = (8.611\times10^{-8},\ 1.32\times10^{-23},\ 5.107\times10^{-7})\,\text{T}$ (the $y$-component is zero as it must be, by the geometry's symmetry — the tiny nonzero value is floating-point noise). Net flux through a $2\,\text{mm}$ cube centered there: $-4.29\times10^{-21}$, versus a field×area scale of $\sim\!5.18\times10^{-7}\,\text{T}\times 2.4\times10^{-5}\,\text{m}^2$ — relative flux error $3.45\times10^{-10}$.

## 6. Analysis, including one finding I didn't expect

- All three checks confirm the integrator is correct: on-axis agreement is near machine precision at every tested $z$ and segment count; continuity as $\rho\to0$ holds to $7\times10^{-15}$; the flux through a tiny closed surface around a genuinely off-axis point vanishes to $3\times10^{-10}$ relative error, consistent with $\nabla\cdot\vec B=0$.
- **Unexpected**: relative error does **not** monotonically shrink with $N$ — it's smallest around $N=100$–$1000$ and about 2–3 orders of magnitude *larger* (though still tiny, $\sim10^{-12}$) at $N=100000$, in every row. This is the expected signature of the midpoint rule applied to a smooth, periodic integrand: such integrals converge *spectrally* (error shrinks faster than any power of $1/N$) until the discretization error drops below floating-point roundoff, after which **summing 100,000 small floating-point terms accumulates more roundoff error than a coarser sum does** — so the curve bottoms out and then rises again with $N$. This is a real, computed observation about floating-point summation, not a sign the physics or the code is wrong (every value involved is still correct to 9+ significant figures); I'm reporting it because it's the kind of detail that's easy to paper over, and because the earlier pendulum item showed no comparable effect (different integrator, different $N$ range tested).

## 7. What this does and does not establish

- **Does establish**: a from-scratch Biot-Savart integrator, checked three independent ways, correctly computes the magnetic field of a circular loop both on- and off-axis — without ever trusting a recalled off-axis formula.
- **Does not establish**: anything new about electromagnetism. This is 19th-century physics (Biot-Savart, 1820; Gauss's law for magnetism as part of Maxwell's equations). Per the same established/computational-prediction/speculative distinction as the pendulum item — everything here is a **verified computational reproduction** of settled physics, not a discovery.
- **Reproducible**: `node docs/agi-research/output/scripts/circular-loop-field.mjs`, runs in well under a second.
