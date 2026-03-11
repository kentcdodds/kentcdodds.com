FROM debian:bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg curl ca-certificates busybox-static \
	&& rm -rf /var/lib/apt/lists/* \
	&& useradd --create-home --shell /bin/bash callkent \
	&& mkdir -p /opt/call-kent-audio/health \
	&& printf 'ok\n' > /opt/call-kent-audio/health/index.html \
	&& chown -R callkent:callkent /opt/call-kent-audio

WORKDIR /opt/call-kent-audio

COPY --chown=callkent:callkent assets ./assets
COPY sandbox/call-kent-audio-cli.sh /usr/local/bin/call-kent-audio-cli

RUN chmod +x /usr/local/bin/call-kent-audio-cli \
	&& chown callkent:callkent /usr/local/bin/call-kent-audio-cli

USER callkent

CMD ["busybox", "httpd", "-f", "-p", "3000", "-h", "/opt/call-kent-audio/health"]
