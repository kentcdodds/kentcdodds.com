import {PrismaClient} from '@prisma/client'
import type {User, Call} from '@prisma/client'

const prisma = new PrismaClient()

function getUserById(authId: string) {
  return prisma.user.findFirst({where: {authId}})
}

function getUserByEmail(email: string) {
  return prisma.user.findUnique({where: {email}})
}

function createNewUser({
  authId,
  email,
}: Omit<User, 'id' | 'team' | 'firstName'>) {
  return prisma.user.create({data: {authId, email}})
}

function updateUser(
  userId: number,
  updatedInfo: Omit<Partial<User>, 'id' | 'authId' | 'email'>,
) {
  return prisma.user.update({where: {id: userId}, data: updatedInfo})
}

function addCall(call: Omit<Call, 'id'>) {
  return prisma.call.create({data: call})
}

function getCallsByUser(userId: number) {
  return prisma.call.findMany({where: {userId}})
}

export {
  prisma,
  getUserById,
  getUserByEmail,
  createNewUser,
  updateUser,
  addCall,
  getCallsByUser,
}
