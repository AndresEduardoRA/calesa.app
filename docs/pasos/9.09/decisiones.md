# 9.09 · higiene del e2e, del CI y de los entornos (partes 1 y 3)

- **Partición.** El paso entero no cabe en un PR: 9.09 lleva la parte 1 (9-8) y la 3 (9-11, 9-4, 9-5, 9-6); 9.09-2 lleva 9-9 y 9-10 (sólo
  specs de e2e, Nivel 1); 9.09-3 lleva 4-41 (`env:check produccion`, toca `src/shared/config/esquemas.ts`, Nivel 2). Para `docs/PLAN.md`:
  la fila 9.09 queda «hecha la parte 1 (9-8) y la 3 (9-11; 9-4 y 9-5 cerrados como decididos; 9-6 abierto)»; 9-9, 9-10 y 4-41 se cierran
  en su paso. 9.09-3 no puede correr a la vez que la Fase 7 (7-1 también edita `esquemas.ts`) ni que el 9.13.
- **9-8: no se renombra la clave real.** El plan la apartaba renombrándola; medido en la base local, `postgres` sólo tiene `select`,
  `delete`, `truncate` y `references` sobre `vault.secrets` (no `update`), y `vault.update_secret()` mueve `updated_at`, de modo que la
  huella `id|updated_at|md5` no volvería. Una clave borrada tampoco vuelve con su id. Se aplica la salida prevista (D1b): con una clave
  real, la prueba que escribe la clave se salta (`test.skip`) y la huella se afirma igual; sin ella, el spec quita lo que dejó. Sigue la
  regla de `asegurarClaveDeRelleno()`: nunca pisa una clave que exista.
- **9-11: el rojo provocado en un dispatch es de la persona.** Una sesión no puede disparar un workflow a mano (el hook lo rechaza): se
  demostró con el guion en local (cinco archivos con contenido) y con la guarda y sus mutaciones. `volcar-base.sh` nunca sale con error y
  cada volcado es independiente. El artefacto vive 14 días y el repo es público: el log de la base y `pg_stat_statements` (consultas
  normalizadas, sin literales) no llevan claves; los datos del e2e son de prueba, como los del `funciones.log` que ya se sube.
- **9-4 y 9-5: cerrados como decididos.** Quedan fuera de CI (`FUERA_DE_CI` en `scripts/guardas/workflows.ts` ya lo vigila): sin runner
  dedicado ni cuenta de cinco corridas. **9-6 sigue abierto con la persona** (cuenta 3 de 5; faltan dos corridas manuales).
- **La guarda nueva va aparte** (`workflows-fallo.ts`): `workflows.ts` (298 líneas) y su test (338) no crecen.
- Sin dependencias nuevas en ninguna parte.

## 9.09-2 · esperas del e2e (9-9 y 9-10)

- **El ayudante envuelve la acción.** `conRespuesta(page, coincide, accion, espera)` recibe la acción y no una promesa ya armada: así la espera
  queda siempre armada antes del clic. `espera` es la etiqueta (tope de 30 s) o `{ etiqueta, tope }`: el lint limita a 4 los parámetros.
- **9-9: 5 de 5, no 15 de 15** (decidido el 2026-11-08: no se gasta en estabilizar). Sin variable permanente `E2E_CPU` en el fixture: el parche
  fue temporal. Con la CPU a 20× una prueba entera supera los 30 s del tiempo de la prueba: se corrió con `--timeout` alto y sólo los casos
  tocados. `esperarHidratado(page, tope = 5_000)` gana un tope opcional; el resumen del lead lo pide de 30 s.
- **9-10: un caso por archivo** con el pedido demorado 6 s. El de `leads-escala` va a `leads-escala-demorado.spec.ts` (el archivo pasaba del tope
  de líneas) y no lleva `@sin-celular` porque la guarda no lo deja: sus ayudantes tienen rama de celular; sale del celular con `test.skip`.
- **`escala-recorrido` sin correr.** No hay volumen sembrado en la base del carril y sembrarlo es un paso largo fuera del alcance: queda escrito,
  tipado por el build del e2e, y el informe lo dice.
- **Las líneas de PLAN de 9-9 y 9-10 eran de antes del 7.x**: la lista de sitios del plan (`.piloto/planes/9.09-2.md`) las reubicó. 9-9 y 9-10
  se cierran con este paso; la fila 9.09 queda «hechas las partes 1, 2 y 3; falta la 4 (4-41) = 9.09-3».
- **Pedido al integrador** (`.claude/rules/e2e.md` está fuera de los módulos del paso): sumar una línea en «Escribir specs»: «un pedido se espera
  con `conRespuesta()` y tope propio: `soporte/esperas.ts`».
- **Trampa del build:** si `next build` cae con «Type '/tablero' is not assignable to RouteImpl», `pnpm typecheck` (que corre `next typegen`)
  lo arregla; no era del código.
- **4-41 (9.09-3), D1–D6.** Producción pide en Vercel las públicas, la secreta, `PORTAL_COOKIE_SECRETO`, la VAPID pública, el correo (remitente, nombre y un
  juego completo de Resend o de Cloudflare: el valor de `EMAIL_PROVEEDOR` no se lee); un preview sólo las cuatro que arrancan la app; las funciones, las
  tres de push; Auth, SMTP, plantillas, URLs y `mailer_otp_exp` = 86400 (lo único que se compara). Tokens e ids de proyecto sólo de `process.env`; el
  ref de Supabase de `SUPABASE_PROJECT_REF` o de `[remotes.demo]`. Salida 0/1/2 (2 gana sobre 1). `pnpm env:check` sin argumento no usa la red.
  Un fallo de la API dice «HTTP n» o «sin respuesta», nunca el cuerpo ni la URL. El tipo `Lectura` vive en `lectura.ts` (no en `produccion.ts`) para
  que los lectores no importen a quien los usa. Contratos de las dos API sin verificar con la nube: lo confirma el primer corrido real de la persona.
- **Pedido al integrador** (docs de carril): PLAN › fila 9.09 «hechas las partes 1 a 4» y mover el abierto 4-41 al archivo como cerrado por 9.09-3.
