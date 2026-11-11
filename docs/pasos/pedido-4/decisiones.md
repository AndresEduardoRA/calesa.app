# pedido-4 (pedido del carril c, 5.03)

- `.github/workflows/ci.yml` › job `e2e`: el paso «chromium y lo que pide del sistema» corre `playwright install --with-deps chromium` con `timeout --kill-after=10 240`; si cae (apt sin espejo, exit 100) o se cuelga, un aviso `::warning::` y `playwright install chromium` sin apt.
- Por qué es seguro: la imagen ubuntu-24.04 ya trae las bibliotecas del sistema (apt decía «already the newest version»); sin apt sólo faltan fuentes extra (fonts-ipafont, unifont, wqy, xfonts), que no cambian los e2e.
- El tope de 240 s cubre apt normal (≈ 30–60 s) más la descarga de chromium; si el timeout corta durante la descarga, el respaldo la repite sin red de apt.
- `timeout` mata el grupo de procesos, así que un `apt-get` colgado no queda vivo.
- Es una guarda del piloto (`.github/workflows/`): el coordinador no integra este PR solo; lo deja entrar la persona.
- Prueba: `scripts/guardas/workflows.test.ts` (45 en verde) y el chequeo de la sintaxis shell con un `timeout` que falla y otro que vence; el efecto real se ve en el CI del PR.
