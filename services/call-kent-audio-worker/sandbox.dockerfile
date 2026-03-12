FROM docker.io/cloudflare/sandbox:0.7.16

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /opt/call-kent-audio

COPY assets ./assets
COPY sandbox/call-kent-audio-cli.sh /usr/local/bin/call-kent-audio-cli

RUN chmod +x /usr/local/bin/call-kent-audio-cli
