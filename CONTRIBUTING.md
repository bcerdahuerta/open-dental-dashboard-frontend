# Guía de contribución — Frontend

Esta guía define cómo colaborar en el frontend del Open Dental Automation Dashboard sin trabajar directo sobre `main`. El objetivo es que cada cambio sea pequeño, revisable, verificable y seguro para producción.

## Regla principal

`main` es una rama protegida. No se trabaja ni se empuja directo sobre `main`.

Todo cambio debe pasar por una rama de trabajo y un Merge Request hacia `main`.

## Repositorios del proyecto

| Repositorio | Propósito | Rama base |
|---|---|---|
| `open-dental-dashboard-frontend` | UI Vue 3/Vuetify, stores Pinia, rutas y tests frontend. | `main` |
| `open-dental-dashboard-backend` | API Flask, workers, migraciones, integraciones y tests backend. | `main` |

Si un cambio toca frontend y backend, abrí una rama y un MR en cada repositorio usando el mismo nombre descriptivo cuando sea posible.

Ejemplo:

```bash
# Frontend
git checkout -b feat/clinic-status-filter

# Backend
git checkout -b feat/clinic-status-filter
```

## Flujo de trabajo

1. Actualizá tu rama base.

   ```bash
   git checkout main
   git pull origin main
   ```

2. Creá una rama nueva.

   ```bash
   git checkout -b feat/descripcion-corta
   ```

3. Implementá el cambio en unidades pequeñas.

4. Ejecutá las verificaciones relevantes.

5. Revisá el diff antes de subir.

   ```bash
   git status
   git diff --stat
   git diff
   ```

6. Hacé commits con formato convencional.

   ```bash
   git add <archivos>
   git commit -m "feat(scope): descripcion breve"
   ```

7. Subí la rama.

   ```bash
   git push -u origin feat/descripcion-corta
   ```

8. Abrí un Merge Request hacia `main` usando el template del repositorio.

## Nombres de rama

Usá este formato:

```text
tipo/descripcion-corta
```

Tipos permitidos:

| Tipo | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `refactor` | Refactor sin cambio funcional esperado |
| `test` | Tests |
| `chore` | Mantenimiento, configuración o tareas internas |
| `ci` | Pipelines o automatización |

Ejemplos:

```text
feat/client-slack-config
fix/writeback-status-badge
docs/contributor-workflow
refactor/client-store-actions
```

## Commits

Usá Conventional Commits:

```text
feat(clients): add Slack configuration form
fix(writeback): correct status badge color
docs(workflow): document merge request process
test(clients): cover Slack workflow store actions
```

Reglas prácticas:

- Un commit debe tener un propósito claro.
- Los tests van en el mismo commit que el comportamiento que verifican.
- La documentación va junto al cambio que explica.
- Evitá commits como `changes`, `fix stuff` o `wip` en una rama lista para MR.

## Tamaño recomendado del MR

Mantené los Merge Requests chicos.

Guía práctica:

| Tamaño | Acción recomendada |
|---|---|
| Menos de 400 líneas cambiadas | Ideal para revisión normal. |
| 400–800 líneas cambiadas | Explicar por qué no se puede dividir. |
| Más de 800 líneas cambiadas | Dividir en MRs más chicos salvo aprobación previa. |

Un MR debe representar una unidad de trabajo revisable: una pantalla, un flujo pequeño, una corrección, un componente reutilizable, o una actualización documental concreta.

## Verificaciones frontend

Antes de pedir revisión, ejecutá lo que aplique:

```bash
# Desde open-dental-dashboard-frontend/full-version/
npm run typecheck
npm run lint
npm run test
npm run build
```

Para cambios puntuales, podés ejecutar tests específicos si corresponde:

```bash
npm run test -- src/stores/__tests__/clients.slackWorkflow.spec.ts
```

Si no corriste una verificación, explicá el motivo en el MR.

## Seguridad y datos sensibles

No subas al repositorio:

- `.env` o variantes locales.
- Tokens, credenciales o URLs privadas con secretos.
- Capturas, exports o archivos que contengan datos de pacientes.
- Archivos temporales de debugging.

Recordá que las variables expuestas al navegador deben llevar prefijo `VITE_`. Nunca pongas secretos reales en variables `VITE_`, porque quedan disponibles en el bundle del cliente.

Antes de abrir un MR, revisá:

```bash
git status --ignored
git diff --cached
```

Si detectás que una credencial fue commiteada, no la borres simplemente en otro commit. Avisá al mantenedor para reescribir historia si hace falta y rotar la credencial.

## Cambios que tocan frontend y backend

Cuando el cambio requiere ambos repositorios:

1. Usá el mismo nombre de rama en ambos repos si es razonable.
2. Abrí dos MRs separados: uno frontend y uno backend.
3. Indicá en cada MR cuál es el MR complementario.
4. Documentá el orden recomendado de merge.
5. Si cambia un contrato API, el MR backend debe explicar el contrato y el MR frontend debe explicar cómo lo consume.

## Antes de pedir revisión

- [ ] La rama sale de `main` actualizado.
- [ ] El MR apunta a `main`.
- [ ] El cambio tiene alcance claro.
- [ ] El diff fue revisado localmente.
- [ ] Las verificaciones relevantes fueron ejecutadas o justificadas.
- [ ] No hay secretos, datos sensibles ni archivos temporales.
- [ ] La descripción del MR explica riesgos y plan de rollback si aplica.

## Merge

Solo los mantenedores pueden aprobar y mergear a `main`. No hagas merge local hacia `main` ni intentes saltarte la protección de rama.
