import {subMonths} from 'date-fns'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const kent = await prisma.user.upsert({
    where: {email: 'me@kentcdodds.com'},
    update: {},
    create: {
      email: `me@kentcdodds.com`,
      firstName: 'Kent',
      team: 'BLUE',
      role: 'ADMIN',
    },
  })

  const hannah = await prisma.user.upsert({
    where: {email: 'me+hannah@kentcdodds.com'},
    update: {},
    create: {
      email: `me+hannah@kentcdodds.com`,
      firstName: 'Hannah',
      team: 'RED',
    },
  })

  const kody = await prisma.user.upsert({
    where: {email: 'me+kody@kentcdodds.com'},
    update: {},
    create: {
      email: `me+kody@kentcdodds.com`,
      firstName: 'Kody',
      team: 'YELLOW',
    },
  })

  const peter = await prisma.user.upsert({
    where: {email: 'me+peter@kentcdodds.com'},
    update: {},
    create: {
      email: `me+peter@kentcdodds.com`,
      firstName: 'Peter',
      team: 'YELLOW',
    },
  })

  await prisma.call.create({
    data: {
      title: 'Thoughts on the whole "Bears" thing for Koalas',
      description: `I'm a Koala. I'm not a bear. What do you think about that?`,
      base64:
        'data:audio/mp3;base64,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',
      userId: kody.id,
      keywords: 'bears,koalas',
    },
  })

  // we'll stick one really old read in for peter to make sure he doesn't
  // show up in the rankings as an active user, but the read *should* show up in the total reads.
  const postReads = [
    prisma.postRead.create({
      data: {
        postSlug: 'super-simple-start-to-remix',
        userId: peter.id,
        createdAt: subMonths(new Date(), 13),
      },
    }),
  ]

  for (const [user, reads] of [
    [kent, 6],
    [hannah, 4],
    [kody, 2],
  ] as const) {
    // user.firstName.length is just an easy way to make these different
    for (let index = 0; index < reads; index++) {
      postReads.push(
        prisma.postRead.create({
          data: {
            postSlug: 'super-simple-start-to-remix',
            userId: user.id,
          },
        }),
      )
    }
  }

  await Promise.all(postReads)

  console.log('created')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
