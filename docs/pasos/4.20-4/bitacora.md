## 2026-11-07 — Paso 4.20-4: la vigencia y el vehículo obligatorio pasan al A

- **Hecho:** sin código. Hoy nada escribe la vigencia ni el vehículo obligatorio de `ajustes_empresa`, y escribirlos pide una RPC nueva y código en `empresa`, del carril A. El B deja el plan del A versionado (`docs/pasos/4.20-4/plan-del-a.md`: 4.20-4a, la base, la regla y la action; 4.20-4b, el formulario y la pestaña «Ajustes») y las decisiones de la persona (P1, P2, P5 y P6, las recomendadas) en `decisiones.md`. El plan se auditó dos veces: la 1.ª bloqueó porque el plan del A sólo vivía en `.piloto/`, que no se versiona; la 2.ª dejó observaciones, atendidas.
- **Aviso:** antes de integrar el PR de `b/4.20`, sumar el 4.20-4a y el 4.20-4b a `docs/plan.yaml` y cambiar el `terminado` del 4.20 (`decisiones.md` › «Cómo se anota»): al fusionarse, el 4.20 se anota integrado solo y libera el 4.21.
- **Verificación:** `bash scripts/mapa.sh --check` (sin código, sin pruebas que correr).
- **Abiertos:** todo el 4.20-4 (A), y los siete abiertos del `terminado` del 4.20 (`decisiones.md` › «Necesita del carril A»).
  e2e completo: no (4.20-4, notas, sin código)
