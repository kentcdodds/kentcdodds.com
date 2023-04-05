# Contributing

Thanks for being willing to contribute!

**Working on your first Pull Request?** You can learn how from this _free_
series [How to Contribute to an Open Source Project on GitHub][egghead]

## Content Changes

Most content changes can be made without cloning the repository. Simply locate
the file you wish to change in the GitHub UI, and click the little edit icon to
make your change directly on the GitHub website.

If you need to make any other substantial changes, then follow the project setup
steps below.

### Translation contributions

Translations for blog posts are more than welcome, but I'm afraid I don't have
the bandwidth to manage them within this repository. So if you'd like to
translate content on my blog, simply translate the post and put it on your own
blog. Then come here and add a link to the translation in the mdx file for the
post you translated. It should look like this:

```mdx
---
title: Some great post
... other stuff ...
translations:
  - language: Español
    link: https://example.com/your/translation/link/here
    author:
      name: Your name
      link: https://example.com/your/link/here
... more other stuff ...
---
```

The link can be your twitter, website, or LinkedIn.

The only requirement is that at the beginning of your translation, you explain
that it is a translation of the original post and link back to the original
post. For example:

> This is a translation of the original post
> [Some great post](https://kentcdodds.com/blog/some-great-post) by
> [Kent C. Dodds](https://kentcdodds.com/).

If you notice an error in an existing translation or if the link to the
translation is not working, please try to reach out to the translator directly
to get it fixed. The only thing we can do in this repo is remove the link. If
you feel that's necessary, feel free to open a pull request to do that.

Thanks for helping to make my content more accessible!

## Project setup

If you do need to set the project up locally yourself, feel free to follow these
instructions:

### System Requirements

- [Node.js](https://nodejs.org/) >= 16.0.0
- [git](https://git-scm.com/) >= 2.7.0
- [Docker](https://www.docker.com/)

### Setup steps

1.  Fork and clone the repo
2.  Copy `.env.example` into `.env`
3.  Run `npm run setup -s` to install dependencies and run validation
4.  Create a branch for your PR with `git checkout -b pr/your-branch-name`

> Tip: Keep your `main` branch pointing at the original repository and make pull
> requests from branches on your fork. To do this, run:
>
> ```
> git remote add upstream https://github.com/kentcdodds/kentcdodds.com.git
> git fetch upstream
> git branch --set-upstream-to=upstream/main main
> ```
>
> This will add the original repository as a "remote" called "upstream," Then
> fetch the git information from that remote, then set your local `main` branch
> to use the upstream main branch whenever you run `git pull`. Then you can make
> all of your pull request branches based on this `main` branch. Whenever you
> want to update your version of `main`, do a regular `git pull`.

If the setup script doesn't work, you can try to run the commands manually:

```sh
git clone <your-fork>
cd ./kentcdodds.com

# copy the .env.example to .env
#   everything's mocked out during development so you shouldn't need to
#   change any of these values unless you want to hit real environments.
cp .env.example .env

# Install deps
npm install

# setup database
prisma migrate reset --force

# run build, typecheck, linting
npm run validate

# setup cache database
npm run prime-cache:mocks

# Install playwright browsers
npm run test:e2e:install

# run e2e tests
npm run test:e2e:run
```

If that all worked without trouble, you should be able to start development
with:

```sh
npm run dev
```

And open up `http://localhost:3000` and rock!

## Mocks

Everything's mocked locally so you should be able to work completely offline.
The DB runs locally, but all third party endpoints are mocked out via
[`MSW`](https://mswjs.io/).

## Caching

Because the mdx files are built on-demand and that can take some time, we
heavily cache them in sqlite. This means that if you need to work on content,
you'll need a way to clear the cache. Luckily, when running the dev script, we
have a file watcher that auto-updates the cache as you save the file. It should
happen so fast you don't even notice what's going on, but I thought I'd mention
it here just so you know if it doesn't work.

## Running automated tests

We have two kinds of tests, unit and component tests with Jest and E2E tests
with Playwright.

```sh
# run the unit and component tests with jest via:
npm run test

# run the Playwright tests in dev mode:
npm run test:e2e:dev

# run the Playwright tests in headless mode:
npm run test:e2e:run
```

Jest runs on changed files as part of the husky git commit hook. Playwright runs
only on CI.

## Running static tests (Formatting/Linting/Typing)

Everything's set up with TypeScript/Prettier/ESLint. These should all run on
commit (only relevant files are checked). You can run them individually though
if you want:

```sh
npm run format
npm run lint
npm run typecheck
```

These are all configured in the project to hopefully work with whatever editor
plugins you have so it should work as you working as well.

## Styles

We use Tailwind for our styles. That's all configured in the
`tailwind.config.js` file. We use the jit feature. The source files are in
`styles` and they build to the `app/styles` directory where our app picks them
up from there.

## Database

We've got SQLite and Prisma set up. Learn about the schema and learn more about
what commands you can run in `./prisma/schema.prisma`.

One common command you might need to run is to re-seed the database:

```sh
npx prisma migrate reset --force
```

In addition to resetting your database to the latest schema, it'll also run the
seed script which will populate the database with some example data.

## Maintenance Tips

### Backup the database

```sh
fly ssh console -C bash -s
# select a specific instance

# make a backup of the database
cp /data/litefs/dbs/sqlite.db/database /data/sqlite.db.bkp

# do an integrity check
sqlite3 /data/sqlite.db.bkp "PRAGMA integrity_check;"

# make a gzip copy so it downloads faster
gzip -c /data/sqlite.db.bkp > /data/sqlite.db.bkp.gz
```

In another tab, download that backup:

```sh
fly sftp get -s /data/sqlite.db.bkp.gz ./sqlite.db.bkp.gz
# select the same instance as above
```

### Handle LiteFS checksum errors

We use LiteFS to proxy the file system for SQLite for multi-regional SQLite. If
things go wrong, this is what you do. First, backup the database, then scale
down to a single region (one that's a primary candidate):

```sh
fly vol list
# delete all but one in a primary candidate instance
fly vol delete <id>
```

Then scale down:

```sh
fly scale count 1
```

Then delete the litefs database and import the backup:

```sh
# ssh into fly console
fly ssh console -C bash -s

# delete the litefs database
rm -rf /data/litefs/dbs/sqlite.db
# import the backup
litefs import -name sqlite.db /data/sqlite.db.bkp
```

Then you should be good to go again.

### Disabling LiteFS

If LiteFS is giving you grief. Then you may want to disable it. To do that,
first backup the database.

In one terminal, ssh into fly:

```sh
fly ssh console -C bash

# make a copy of the database
cp /data/litefs/dbs/sqlite.db/database /data/sqlite.db

# do an integrity check
sqlite3 /data/sqlite.db "PRAGMA integrity_check;"
```

Then make sure to scale down to a single region:

```sh
fly vol list
# grab the ID for all but the primary you want to keep
fly vol delete {id}
fly scale count 1
```

Update the Dockerfile:

```Dockerfile
# TODO: enable litefs
# ENV LITEFS_DIR="/litefs"
ENV LITEFS_DIR="/data"

...

# prepare for litefs
# TODO: enable litefs
# COPY --from=flyio/litefs:sha-7e5287a /usr/local/bin/litefs /usr/local/bin/litefs
# ADD other/litefs.yml /etc/litefs.yml
# RUN mkdir -p /data ${LITEFS_DIR}

# CMD ["litefs", "mount", "--", "node", "./other/start.js"]
CMD ["node", "./other/start.js"]
```

Then push that to fly.

You'll lose any data created between when you did the backup and when the deploy
finishes, but hopefully you won't have LiteFS issues.

### Adding more regions

When doing stuff like this it's not a bad idea to do a database backup first
(even though Fly backs-up your volumes daily for you).

Even though fly has a specific command for adding and removing regions, when
regions have volumes, you instead control the regions by adding more volumes to
specific regions and then scaling up. For example:

```sh
fly vol create data --size 3 --region ams
fly scale count 2
```

### Removing regions

Similar to adding regions, maybe backup the data.

First, you should know which volume is the current primary region. It's kinda
hard to tell without SSH-ing into the boxes and looking for the `.primary` file,
but instead you can hit the site and check the `x-fly-primary-instance` header
which will be the hostname of the primary instance. Just make sure you don't
take that one down. If you need to change the primary, make sure to update
`litefs.yml` first so another region can take over as candidate.

Now that you know the volume you _don't_ want to delete, run:

```sh
fly vol list
```

That'll show you all the volumes, then run:

```sh
fly vol destroy <VOL_ID>
```

And when you're finished, scale down to the number of volumes you have:

```sh
fly scale count <COUNT>
```

## Help needed

Please checkout [the open issues][issues]

Also, please watch the repo and respond to questions/bug reports/feature
requests! Thanks!

<!-- prettier-ignore-start -->
[egghead]: https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github
[issues]: https://github.com/kentcdodds/kentcdodds.com/issues
<!-- prettier-ignore-end -->
