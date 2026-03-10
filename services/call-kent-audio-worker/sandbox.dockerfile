FROM debian:bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /opt/call-kent-audio

COPY assets ./assets
COPY sandbox/call-kent-audio-cli.sh /usr/local/bin/call-kent-audio-cli

RUN chmod +x /usr/local/bin/call-kent-audio-cli
