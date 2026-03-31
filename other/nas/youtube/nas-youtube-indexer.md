# NAS YouTube indexer

This wraps the existing YouTube semantic-search indexer in a one-shot Docker
container intended for a NAS or any always-on machine with a residential IP.

It expects a checkout of this repository to build from. If this folder lives
outside the repo, set `REPO_ROOT=/path/to/kentcdodds.com` when running it.

## What it does

- builds a small image for this repo
- runs `other/semantic-search/index-youtube-playlist.ts`
- mounts a persistent cache volume for YouTube transcript responses
- reads secrets from an env file on the host
- uses host networking to avoid NAS Docker DNS issues

## First-time setup

1. Copy this repo to the NAS.
2. Copy `other/nas/youtube/youtube-indexer.env.example` to
   `other/nas/youtube/youtube-indexer.env`.
3. Fill in the env vars in `other/nas/youtube/youtube-indexer.env`.
4. Make the scripts executable:

```sh
chmod +x other/nas/youtube/run-youtube-indexer.sh
chmod +x other/nas/youtube/start-youtube-indexer.sh
chmod +x other/nas/youtube/youtube-index-task.sh
```

## Run it

From the repo root on the NAS:

```sh
other/nas/youtube/start-youtube-indexer.sh
```

The start script is just a convenient manual entrypoint and forwards all args to
`run-youtube-indexer.sh`.

You can also pass normal indexer args through to the Node script:

```sh
other/nas/youtube/start-youtube-indexer.sh --videos dQw4w9WgXcQ
other/nas/youtube/start-youtube-indexer.sh --max-videos 10
```

## Persistent cache

By default, the host cache directory is:

```text
other/nas/youtube/.cache/youtube-transcripts
```

You can override it:

```sh
CACHE_DIR=/volume1/docker/kcd-youtube-cache \
other/nas/youtube/start-youtube-indexer.sh
```

## Using a repo checkout elsewhere

If you copied only this folder to another location, point it at a real repo
checkout:

```sh
REPO_ROOT=/volume1/code/kentcdodds.com \
other/nas/youtube/start-youtube-indexer.sh
```

## Alternate env file or image tag

```sh
ENV_FILE=/volume1/secrets/kcd-youtube-indexer.env \
IMAGE_TAG=kcd-youtube-indexer:nas \
other/nas/youtube/start-youtube-indexer.sh
```

### Secrets and `docker inspect`

`run-youtube-indexer.sh` **bind-mounts** `youtube-indexer.env` to
`/run/secrets/youtube-indexer.env` and starts Node with
**`--env-file=/run/secrets/youtube-indexer.env`** (Node 20+). Variables are
loaded before your script runs, and **`docker inspect` does not list** those
values in `Config.Env` (only the mount and a few explicit `-e` vars such as
`YOUTUBE_TRANSCRIPT_CACHE_DIR` may appear).

Anyone with access to the container filesystem can still read the mounted file;
file permissions on the NAS host still matter.

### Docker BuildKit on Synology

`run-youtube-indexer.sh` defaults to **`DOCKER_BUILDKIT=0`** (legacy builder)
because Synology’s Docker often has no **buildx**, and BuildKit then fails with
“buildx component is missing”. On a normal Docker install with buildx, you can
set **`DOCKER_BUILDKIT=1`** when running the script.

You can also override the runtime container name:

```sh
CONTAINER_NAME=kcd-youtube-indexer-manual \
other/nas/youtube/start-youtube-indexer.sh
```

## Scheduling

Synology Task Scheduler: run `other/nas/youtube/youtube-index-task.sh` (or paste
its contents into **User-defined script**). That script clones or pulls the
repo under `/volume1/docker/kentcdodds.com/repo`, then runs
`start-youtube-indexer.sh` with `REPO_ROOT` set.

For a simple cron line without the bundled task script:

```sh
cd /path/to/kentcdodds.com && other/nas/youtube/start-youtube-indexer.sh
```

If you already have a full repo checkout on the NAS and only need a pull:

```sh
cd /path/to/kentcdodds.com && git pull --ff-only && other/nas/youtube/start-youtube-indexer.sh
```

## Logging

The task script `youtube-index-task.sh` appends everything to **one file**:

```text
logs/youtube-indexer.log
```

(Override with `LOG_FILE=/path/to/file`.) It also sends the same lines to
stdout via `tee`.

### Synology DSM quirks

- **Task Scheduler → Run Result** often shows **no stdout/stderr until the task
  finishes** (or never streams live). That is a DSM limitation, not your script.
  For live output, open **File Station** and **tail** the log file, or SSH with
  `tail -f` if you enable it later.
- **Container Manager → Log** for a container that only exists during
  `docker build` (for example the container running `RUN npm ci`) often shows
  **“No logs available”**. Build output still goes to **Docker’s build stream**,
  which is what you see in `youtube-indexer.log` when the task runs
  `start-youtube-indexer.sh`.

## Container names in Docker UI

- **Git helper:** `kcd-youtube-indexer-git` (explicit `docker run --name`).
- **Indexer (after build):** `kcd-youtube-indexer` (from `CONTAINER_NAME` in
  `run-youtube-indexer.sh`).

### Why you still see names like `festive_fermat`

During **`docker build`**, each Dockerfile step runs in a **temporary**
container. Docker **does not** let you set a friendly `--name` for those; the UI
shows random names like `adjective_scientist`. That container is **only** the
build running something like `npm ci`, not the final indexer.

The **named** container `kcd-youtube-indexer` appears when the build **finishes**
and the script runs **`docker run --name kcd-youtube-indexer`** for the Node
indexer. If the build is still on step `RUN npm ci`, you will not see that
named container yet.

### Image column showing `-`

Intermediate build containers are tied to internal image layers; Synology may not
show a human-readable image name for them. That is normal.
