FROM jenkins/jenkins:lts-jdk17

USER root

# Node (Global Tool / npx) enlaza contra libatomic — debe existir en la imagen del controller/agent.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

RUN mkdir -p /usr/local/libexec/docker/cli-plugins

COPY --from=docker/compose-bin:latest /docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

RUN chmod +x /usr/local/bin/docker /usr/local/libexec/docker/cli-plugins/docker-compose

# GID del propietario de grupo de /var/run/docker.sock en el HOST (docker-compose pasa build-arg desde .env).
# Valor por defecto si construyes a mano sin compose: 999 (típico en Linux); Docker Desktop suele ser 0 → pon DOCKER_GID=0 en .env.
ARG DOCKER_GID=999
RUN set -eux; \
    EXISTING="$(getent group "${DOCKER_GID}" | cut -d: -f1 || true)"; \
    if [ -z "${EXISTING}" ]; then \
      groupadd -g "${DOCKER_GID}" docker-sock; \
      EXISTING=docker-sock; \
    fi; \
    usermod -aG "${EXISTING}" jenkins

USER jenkins
