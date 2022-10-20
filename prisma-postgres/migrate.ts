import {PrismaClient as SqliteClient} from '@prisma/client'
// eslint-disable-next-line import/no-extraneous-dependencies
import {PrismaClient as PostgresClient} from '@prisma/client-postgres'

const pg = new PostgresClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_DATABASE_URL,
    },
  },
})
const sq = new SqliteClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// TIP: do not do this if you have lots of data... I don't
// copy all data from pg to sq
async function main() {
  await pg.$connect()
  await sq.$connect()

  const users = await pg.user.findMany()
  for (const user of users) {
    // eslint-disable-next-line no-await-in-loop
    await sq.user.create({data: user})
  }

  const sessions = await pg.session.findMany()
  for (const session of sessions) {
    // eslint-disable-next-line no-await-in-loop
    await sq.session.create({data: session})
  }

  const postReads = await pg.postRead.findMany()
  for (const postRead of postReads) {
    // eslint-disable-next-line no-await-in-loop
    await sq.postRead.create({data: postRead})
  }

  const calls = await pg.call.findMany()
  for (const call of calls) {
    // eslint-disable-next-line no-await-in-loop
    await sq.call.create({data: call})
  }

  console.log('✅  all finished')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pg.$disconnect()
    await sq.$disconnect()
  })
