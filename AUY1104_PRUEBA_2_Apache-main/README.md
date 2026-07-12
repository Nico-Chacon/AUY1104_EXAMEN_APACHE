![hi-hello](hi-hello.gif)
# Apache Demo (caso TechMarket Orders) — Evaluación Final Transversal (AUY1104)

Microservicio crítico "Orders" migrado a un clúster Kubernetes gestionado
(K3s sobre EC2, provisionado en el laboratorio de AWS Academy, en reemplazo
de un EKS gestionado real dado que la cuenta académica no permite crear
clústeres EKS administrados). A nivel de arquitectura y de pipeline, la
solución es equivalente a la que se usaría contra un EKS real: el `kubectl`
apunta a la API de Kubernetes del clúster, sin importar si es EKS o K3s.

## 1. Arquitectura general

```
                          ┌─────────────────────────────┐
   Usuarios ───────────▶ │   Service: apache-demo-service     │  (NodePort 30090)
                          │   selector: version=<activo>  │
                          └───────────────┬───────────────┘
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
          ┌───────────────────────┐             ┌───────────────────────┐
          │ Deployment apache-demo-blue │             │ Deployment apache-demo-green│
          │ (version=blue)          │             │ (version=green)        │
          └───────────────────────┘             └───────────────────────┘
                       ▲                                     ▲
          Service dedicado (30091)                Service dedicado (30092)
          apache-demo-blue-svc                          apache-demo-green-svc
          (usado SOLO para validar salud            (usado SOLO para validar salud
          sin afectar tráfico real)                 sin afectar tráfico real)

          ┌─────────────────────────────────────────────────────┐
          │  Deployment apache-demo-watchdog (corre 24/7 en el clúster) │
          │  Golpea el color activo cada 15s. Si falla 3 veces    │
          │  seguidas, revierte el Service público al otro color. │
          └─────────────────────────────────────────────────────┘
```

## 2. Pipeline de CI/CD (GitHub Actions)

El workflow de este repo (`.github/workflows/deploy.yaml`) no contiene la
lógica de despliegue: la delega en una **plantilla reutilizable (EP1)**
alojada en el repo `AUY1104_PRUEBA_2_Primary`, invocada con `uses:`. Esto
estandariza el pipeline para cualquier microservicio que lo necesite, no
solo Orders.

Etapas de la plantilla reutilizable:

1. **Tests** (`npm test`).
2. **Build & Push**: construye la imagen Docker y la publica en Docker Hub
   con dos tags (la versión y `latest`).
3. **Determinar color activo**: se consulta el `selector.version` del
   Service público para saber si `blue` o `green` está sirviendo tráfico
   ahora mismo. El color contrario es el "objetivo" de este despliegue.
4. **Desplegar en el color objetivo**: se aplica el manifiesto base (si es
   la primera vez) y se actualiza SOLO la imagen del color inactivo vía
   `kubectl set image`. El color activo nunca se toca.
5. **Validación de Salud**: el pipeline golpea el Service dedicado del
   color objetivo (no el público) 5 veces, midiendo código HTTP y latencia.
   Si hay error 500 o latencia > 2s, la validación falla.
6. **Mover tráfico (100%)**: solo si la validación de salud fue exitosa, se
   hace `kubectl patch` al Service público para apuntar al nuevo color.
7. **Rollback automático**: si la validación de salud falla, el Service
   público jamás se modifica — los usuarios nunca dejan de ver la versión
   estable. Es un rollback "gratis" porque el tráfico nunca se movió.

## 3. Estrategia de despliegue: Blue-Green (¿por qué no Canary?)

Elegimos **Blue-Green** por sobre Canary porque:

- No requiere un Ingress Controller con soporte de *traffic splitting* por
  peso (que nuestro clúster K3s de laboratorio no tiene instalado), solo
  `Service` + `Deployment` nativos de Kubernetes.
- El cambio de tráfico es atómico (0% o 100%), lo que hace mucho más fácil
  demostrar y explicar el corte en vivo durante la defensa.
- Al mantener 2 Deployments completos (blue y green) siempre desplegados,
  el rollback es instantáneo: no hay que reconstruir nada, solo apuntar el
  selector al color anterior.

Trade-off asumido: se consume el doble de recursos (2 réplicas activas en
todo momento) a cambio de mayor seguridad y velocidad de rollback — decisión
razonable para un servicio crítico como "Orders".

## 4. Remediación automática (Ítem 3 / "Prueba de Fuego")

Hay **dos capas** de auto-remediación, porque cubren fallas distintas:

**a) A nivel de pipeline (deploy-time):** si la nueva versión falla la
Validación de Salud (paso 5 arriba), nunca recibe tráfico real. Cubre
errores introducidos por un despliegue defectuoso.

**b) A nivel de runtime (in-cluster, `apache-demo-watchdog`):** un Deployment
que corre permanentemente dentro del clúster, con permisos RBAC mínimos
(`get`/`patch` sobre Services), que:
- Cada 15 segundos golpea el Service dedicado del color actualmente activo.
- Si detecta 3 fallos consecutivos (status ≠ 200 o latencia > 2s), hace
  `kubectl patch` al Service público para volver automáticamente al otro
  color, sin intervención humana ni un nuevo pipeline.

Esta capa es la que responde al **error "desconocido" que el docente
inyecta en vivo**: como no depende de un nuevo push a GitHub, detecta y
repara sin que el equipo tenga que tocar nada durante la defensa.

Adicionalmente, para fallas de tipo "el contenedor se cae"
(`CrashLoopBackOff`), Kubernetes ya se auto-repara solo gracias a los
`livenessProbe` configurados en cada Deployment (reinicio automático del
pod tras 3 fallos de sonda).

## 5. Cómo probarlo en vivo (para la defensa)

```bash
# Ver qué color está activo ahora mismo:
kubectl get service apache-demo-service -o jsonpath='{.spec.selector.version}'

# Simular una falla en el color activo (ejemplo: apuntar a una imagen rota):
kubectl set image deployment/apache-demo-blue orders=nginx:esta-imagen-no-existe

# Ver al watchdog reaccionar en tiempo real:
kubectl logs -f deployment/apache-demo-watchdog
```

## 6. Variables y secretos usados

| Nombre | Tipo | Dónde se define | Uso |
|---|---|---|---|
| `K3S_SERVER_PUBLIC_IP` | Variable de repo | Settings → Variables | IP pública del nodo K3s (AWS Academy) |
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | Secret | Settings → Secrets | Login y push a Docker Hub |
| `EA2_SSH_PRIVATE_KEY` | Secret | Settings → Secrets | Acceso SSH al nodo K3s para aplicar manifiestos |

> Nota: al ser un laboratorio de AWS Academy, las credenciales (incluyendo
> el token de sesión de AWS usado por el workflow de aprovisionamiento) se
> rotan cada vez que se reinicia el laboratorio, por lo que los secretos se
> actualizan manualmente antes de cada corrida.

## 7. Referencias (formato APA)

Amazon Web Services. (2024). *Amazon Elastic Kubernetes Service (EKS)
documentation*. AWS Documentation. https://docs.aws.amazon.com/eks/

GitHub. (2024). *GitHub Actions documentation*. GitHub Docs.
https://docs.github.com/actions

Kubernetes. (2024). *Kubernetes documentation*. Kubernetes.io.
https://kubernetes.io/docs/home/

![glup](glup.jpg)
miau