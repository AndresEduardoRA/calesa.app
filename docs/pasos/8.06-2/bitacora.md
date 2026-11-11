## 2026-11-11 · Paso 8.06-2: la tarjeta «Web pública», «Probar» y el entorno sin variables (parte 2 de 2; 8.06 completo)

- **Hecho:**
  - **Entorno.** Sin `WEB_PUBLICA_REVALIDAR_URL` ni `…_SECRETO` (`esquemas.ts`, `.env.example`, `docs/ENTORNOS.md`): dirección en
    `integraciones.config` y secreto en Vault. Cierra la contradicción 1 de `docs/PLAN.md` (la URL con dos casas).
  - **Regla de la dirección.** `esDireccionDeRevalidacion()` acepta una https pública y, sólo si se permite, el loopback; rechaza redes internas
    literales, IPv6 literal y usuario y clave; mira el host normalizado por WHATWG y sin el punto final.
  - **«Probar».** `probarRevalidacion()` (`empresa/infra/revalidacion-prueba.ts`, segunda excepción del cliente admin): permiso con el cliente de
    quien prueba, dirección guardada y su regla, y recién entonces el admin para `integracion_secreto('web_publica')`. POST con cuerpo fijo, sin
    redirecciones, 5 s, devuelve sólo el código. Lint, `.claude/rules/datos.md` y `admin.ts` la nombran.
  - **Conteo.** `leerVehiculosQueCambian()` (acotado a 50), sólo para quien puede editar.
  - **Tarjeta.** «Web pública» en Integraciones: interruptor con el conteo, dirección, secreto (`<CampoSecreto>` por clave) y «Probar».
  - **Contrato con el sitio** en la ficha de `web` y en `decisiones.md` (D10–D17).
- **Commits:** `aeb147cd` (el entorno), `adbf5f72` (la regla), `57fee961` («Probar»), `68efa964` (el conteo), `63d64326` (la tarjeta),
  `c13d4f27` (el e2e) y el de docs.
- **Verificación** (`.piloto/salidas/8.06-2/`): vitest de lo tocado, `scripts/guardas` y los e2e dirigidos (ver el informe del paso).
- e2e completo: no (8.06-2, Nivel 2 por shared: lo corre el CI del PR)
