FROM debian:bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& useradd --create-home --shell /bin/bash callkent \
	&& mkdir -p /opt/call-kent-audio \
	&& chown callkent:callkent /opt/call-kent-audio

WORKDIR /opt/call-kent-audio

COPY --chown=callkent:callkent assets ./assets
COPY sandbox/call-kent-audio-cli.sh /usr/local/bin/call-kent-audio-cli

RUN chmod +x /usr/local/bin/call-kent-audio-cli \
	&& chown callkent:callkent /usr/local/bin/call-kent-audio-cli

USER callkent
