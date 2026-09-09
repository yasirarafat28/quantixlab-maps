ARG JAVA_IMAGE
FROM ${JAVA_IMAGE}
ARG PHOTON_VERSION=1.2.1
ARG PHOTON_SHA256=6ea66d598a3f6fc1b59b0f81ad4f8abee72ccdb9d3db03bc12008974cdebd58d
ADD https://github.com/komoot/photon/releases/download/${PHOTON_VERSION}/photon-${PHOTON_VERSION}.jar /app/photon.jar
RUN apt-get update && apt-get install --yes --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/* \
  && echo "${PHOTON_SHA256}  /app/photon.jar" | sha256sum -c - \
  && chmod 0444 /app/photon.jar && useradd --system --uid 10001 --home /data photon
USER 10001
EXPOSE 2322
ENTRYPOINT ["java", "-Xms2g", "-Xmx6g", "-jar", "/app/photon.jar"]
CMD ["serve", "-data-dir", "/data", "-listen-ip", "0.0.0.0", "-listen-port", "2322", "-default-language", "en", "-max-results", "10", "-query-timeout", "5"]
