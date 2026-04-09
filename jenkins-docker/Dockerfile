FROM jenkins/jenkins:lts-jdk17

USER root

COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

RUN mkdir -p /usr/local/libexec/docker/cli-plugins

COPY --from=docker/compose-bin:latest /docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

RUN chmod +x /usr/local/bin/docker /usr/local/libexec/docker/cli-plugins/docker-compose

RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

USER jenkins