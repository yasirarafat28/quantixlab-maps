ARG JAVA_BUILD_IMAGE
ARG JAVA_IMAGE

FROM --platform=$BUILDPLATFORM ${JAVA_BUILD_IMAGE} AS build
ARG PHOTON_COMMIT=847781173c028378f9f0af83e34e008a9e51b072
RUN apt-get update && apt-get install --yes --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/* \
  && git init /src && cd /src \
  && git remote add origin https://github.com/komoot/photon.git \
  && git fetch --depth=1 origin "${PHOTON_COMMIT}" \
  && git checkout --detach FETCH_HEAD \
  && test "$(git rev-parse HEAD)" = "${PHOTON_COMMIT}" \
  && ./gradlew --no-daemon shadowJar \
  && cp target/photon-*.jar /tmp/photon.jar

FROM ${JAVA_IMAGE}
RUN apt-get update && apt-get install --yes --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /data photon
COPY --from=build --chown=10001:10001 --chmod=0444 /tmp/photon.jar /app/photon.jar
USER 10001
EXPOSE 2322
ENTRYPOINT ["java", "-Xms2g", "-Xmx6g", "-jar", "/app/photon.jar"]
CMD ["serve", "-data-dir", "/data", "-listen-ip", "0.0.0.0", "-listen-port", "2322", "-default-language", "en", "-max-results", "10", "-query-timeout", "5"]
