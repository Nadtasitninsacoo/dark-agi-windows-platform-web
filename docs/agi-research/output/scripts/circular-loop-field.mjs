// Mission 03 — second scoped item: electromagnetism (magnetostatics).
//
// Question: does a from-scratch numerical Biot-Savart integration of a circular current loop reproduce
// the on-axis field correctly, and does the resulting off-axis field (where I deliberately do NOT use any
// recalled closed-form formula, to avoid presenting a misremembered formula as "established") satisfy the
// two independent physical checks that must hold for any valid magnetostatic field: (1) continuity as the
// off-axis field point approaches the axis, and (2) Gauss's law for magnetism, div(B) = 0 everywhere.
//
// Established physics used (not derived or recalled as a formula to match against — only the LAW itself):
//   - Biot-Savart law: dB = (mu0 I / 4pi) * dl x r_hat / r^2
//   - div(B) = 0 (no magnetic monopoles) for ANY valid B field, loop or otherwise.
// The on-axis closed form below IS derived here, step by step, from Biot-Savart + the loop's axial
// symmetry — not pulled from memory — specifically so it can serve as an honest, checkable reference.
//
// Run: node circular-loop-field.mjs

const MU0 = 4 * Math.PI * 1e-7; // exact SI value (pre-2019 redefinition; still the standard adopted value)
const A = 1; // loop radius, m
const I = 1; // current, A

/** Numerical Biot-Savart field at point P=[x,y,z] from a loop of radius A in the z=0 plane, N segments. */
function biotSavartField(P, N = 20000) {
  const [x, y, z] = P;
  let [bx, by, bz] = [0, 0, 0];
  const dphi = (2 * Math.PI) / N;
  for (let i = 0; i < N; i++) {
    const phi = (i + 0.5) * dphi; // midpoint rule
    const sx = A * Math.cos(phi), sy = A * Math.sin(phi), sz = 0;
    // dl = d/dphi (sx,sy,sz) * dphi = A*(-sin phi, cos phi, 0) * dphi
    const dlx = -A * Math.sin(phi) * dphi, dly = A * Math.cos(phi) * dphi, dlz = 0;
    const rx = x - sx, ry = y - sy, rz = z - sz;
    const r2 = rx * rx + ry * ry + rz * rz;
    const r = Math.sqrt(r2);
    const r3 = r2 * r;
    // dB = (mu0 I / 4pi) * dl x r / r^3   (dl x r_hat / r^2 = dl x r / r^3)
    const cx = dly * rz - dlz * ry, cy = dlz * rx - dlx * rz, cz = dlx * ry - dly * rx;
    const k = MU0 * I / (4 * Math.PI * r3);
    bx += k * cx; by += k * cy; bz += k * cz;
  }
  return [bx, by, bz];
}

/** Derived here (not recalled): on-axis field by symmetry. Each element is distance r=sqrt(A^2+z^2) from
 * an on-axis point; dl is perpendicular to r so |dl x r_hat| = dl, and by symmetry only the z-component
 * survives the integral around the loop, with sin(theta) = A/r for every element (theta = angle between r
 * and the loop plane). Integrating dl around the full circumference (2*pi*A) with r constant:
 *   Bz = (mu0 I / 4pi) * (1/r^2) * (A/r) * (2*pi*A) = mu0 * I * A^2 / (2 * r^3), r = sqrt(A^2+z^2).
 */
function onAxisBzAnalytic(z) {
  const r = Math.sqrt(A * A + z * z);
  return (MU0 * I * A * A) / (2 * r * r * r);
}

// ── Check 1: numerical Biot-Savart vs the on-axis closed form just derived, plus a convergence study ──
const onAxisZs = [0, 0.3, 1, 3];
const convergenceNs = [100, 1000, 10000, 100000];
const onAxisResults = onAxisZs.map((z) => {
  const analytic = onAxisBzAnalytic(z);
  const byN = convergenceNs.map((N) => {
    const [, , bz] = biotSavartField([0, 0, z], N);
    return { N, bz, relErr: Math.abs(bz - analytic) / analytic };
  });
  return { z, analytic, byN };
});

// ── Check 2: continuity as an off-axis point approaches the axis ──
const zContinuity = 0.5;
const analyticAtZ = onAxisBzAnalytic(zContinuity);
const nearAxisRho = 1e-4;
const [, , bzNearAxis] = biotSavartField([nearAxisRho, 0, zContinuity], 50000);
const continuityRelErr = Math.abs(bzNearAxis - analyticAtZ) / analyticAtZ;

// ── Check 3: div(B) = 0 at a genuinely off-axis point, via numerical flux through a tiny closed cube ──
function fluxThroughCube(center, halfWidth, gridPerFace = 9, N = 20000) {
  const [cx, cy, cz] = center;
  const h = halfWidth;
  const step = (2 * h) / (gridPerFace - 1);
  const faceArea = step * step;
  let flux = 0;
  const faces = [
    { axis: 0, sign: +1 }, { axis: 0, sign: -1 },
    { axis: 1, sign: +1 }, { axis: 1, sign: -1 },
    { axis: 2, sign: +1 }, { axis: 2, sign: -1 },
  ];
  for (const face of faces) {
    for (let a1 = 0; a1 < gridPerFace; a1++) {
      for (let a2 = 0; a2 < gridPerFace; a2++) {
        const u = -h + a1 * step, v = -h + a2 * step;
        let P;
        if (face.axis === 0) P = [cx + face.sign * h, cy + u, cz + v];
        else if (face.axis === 1) P = [cx + u, cy + face.sign * h, cz + v];
        else P = [cx + u, cy + v, cz + face.sign * h];
        const B = biotSavartField(P, N);
        flux += face.sign * B[face.axis] * faceArea;
      }
    }
  }
  return flux;
}

const offAxisPoint = [0.3, 0, 0.4]; // genuinely off-axis: rho=0.3, z=0.4
const offAxisField = biotSavartField(offAxisPoint, 50000);
const typicalFieldScale = Math.hypot(...offAxisField);
const cubeHalfWidth = 1e-3;
const flux = fluxThroughCube(offAxisPoint, cubeHalfWidth, 9, 20000);
const cubeSurfaceArea = 6 * (2 * cubeHalfWidth) ** 2;
const fluxRelErr = Math.abs(flux) / (typicalFieldScale * cubeSurfaceArea);

console.log(JSON.stringify({
  MU0, A, I,
  check1_onAxisVsDerivedFormula: onAxisResults,
  check2_continuityAsRhoToZero: { z: zContinuity, analytic: analyticAtZ, nearAxisRho, bzNearAxis, relErr: continuityRelErr },
  check3_divergenceFreeAtOffAxisPoint: { point: offAxisPoint, field: offAxisField, fieldMagnitude: typicalFieldScale, cubeHalfWidth, flux, fluxRelErr },
}, null, 2));
