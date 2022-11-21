import {PrismaClient as SqliteClient} from '@prisma/client'
// eslint-disable-next-line import/no-extraneous-dependencies
import {PrismaClient as PostgresClient} from '@prisma/client-postgres'

// TIP: do not do this if you have lots of data... I don't
// copy all data from pg to sq
async function main() {
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
  await pg.$connect()
  await sq.$connect()

  console.log('connected 🔌')

  await upsertUsers()
  await upsertSessions()
  await upsertPostReads()
  await upsertCalls()

  console.log('✅  all finished')

  await pg.$disconnect()
  await sq.$disconnect()

  async function upsertUsers() {
    console.time('users 👥')
    const users = await pg.user.findMany()
    console.log(`Found ${users.length} users. Upserting them into SQLite ⤴️`)
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await sq.user.upsert({where: {id: user.id}, update: user, create: user})
    }
    console.timeEnd('users 👥')
  }

  async function upsertSessions() {
    console.time('sessions 📊')
    const sessions = await pg.session.findMany()
    console.log(
      `Found ${sessions.length} sessions. Upserting them into SQLite ⤴️`,
    )
    for (const session of sessions) {
      // eslint-disable-next-line no-await-in-loop
      await sq.session.upsert({
        where: {id: session.id},
        update: session,
        create: session,
      })
    }
    console.timeEnd('sessions 📊')
  }

  async function upsertPostReads() {
    console.time('postReads 📖')
    const postReads = await pg.postRead.findMany()
    console.log(
      `Found ${postReads.length} post reads. Upserting them into SQLite ⤴️`,
    )
    for (let index = 0; index < postReads.length; index++) {
      if (index % 100 === 0) {
        console.log(`Upserting ${index}`)
      }
      const postRead = postReads[index]
      if (!postRead) {
        console.log('HUH???', index)
        continue
      }
      // eslint-disable-next-line no-await-in-loop
      await sq.postRead.upsert({
        where: {id: postRead.id},
        update: postRead,
        create: postRead,
      })
    }
    console.timeEnd('postReads 📖')
  }

  async function upsertCalls() {
    console.time('calls 📞')
    const calls = await pg.call.findMany()
    console.log(`Found ${calls.length} calls. Upserting them into SQLite ⤴️`)
    for (const call of calls) {
      // eslint-disable-next-line no-await-in-loop
      await sq.call.upsert({where: {id: call.id}, update: call, create: call})
    }
    console.timeEnd('calls 📞')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
