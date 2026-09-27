"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, isObjectId, ActionError } from "@/lib/db";
import { run } from "@/lib/action";
import { endSessionsForUser, requireAdmin } from "@/lib/auth/session";
import type { MessageKey } from "@/lib/i18n";
import { MIN_PASSWORD_LENGTH, USERNAME_RE, generatePassword, hashPassword, normalizeUsername, passwordProblem } from "@/lib/auth/password";

const roleSchema = z.enum(["ADMIN", "STAFF"]);

function targetId(id: unknown, meId: string, self: MessageKey): string {
  if (!isObjectId(id)) throw new ActionError("err.unknownAccount");
  if (id === meId) throw new ActionError(self);
  return id;
}

const createSchema = z.object({
  username: z
    .string()
    .transform(normalizeUsername)
    .refine((u) => USERNAME_RE.test(u), "err.usernameRule"),
  name: z.string().trim().min(1, "err.enterName").max(60),
  role: roleSchema,
  password: z.string().max(200).optional(),
});

/** Returns the password to hand over (shown once). */
export async function createUserAction(input: unknown) {
  return run(async () => {
    await requireAdmin();
    const v = createSchema.parse(input);
    const password = v.password?.trim() ? v.password : generatePassword(v.username);
    const problem = passwordProblem(password, v.username);
    if (problem) throw new ActionError(problem, { n: MIN_PASSWORD_LENGTH });
    try {
      await prisma.user.create({
        data: { username: v.username, name: v.name, role: v.role, passwordHash: await hashPassword(password) },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ActionError("err.usernameTaken");
      }
      throw e;
    }
    revalidatePath("/users");
    return { username: v.username, password };
  });
}

export async function setRoleAction(id: string, role: string) {
  return run(async () => {
    const me = await requireAdmin();
    const uid = targetId(id, me.id, "err.selfRole");
    await prisma.user.update({ where: { id: uid }, data: { role: roleSchema.parse(role) } });
    await endSessionsForUser(uid);
    revalidatePath("/users");
    return null;
  });
}

export async function setActiveAction(id: string, isActive: boolean) {
  return run(async () => {
    const me = await requireAdmin();
    const uid = targetId(id, me.id, "err.selfDisable");
    await prisma.user.update({ where: { id: uid }, data: { isActive: Boolean(isActive) } });
    if (!isActive) await endSessionsForUser(uid);
    revalidatePath("/users");
    return null;
  });
}

export async function resetPasswordAction(id: string) {
  return run(async () => {
    const me = await requireAdmin();
    if (!isObjectId(id)) throw new ActionError("err.unknownAccount");
    if (id === me.id) throw new ActionError("err.selfReset");
    const user = await prisma.user.findUnique({ where: { id }, select: { username: true } });
    if (!user) throw new ActionError("err.unknownAccount");
    const password = generatePassword(user.username);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date() },
    });
    await endSessionsForUser(id);
    revalidatePath("/users");
    return { username: user.username, password };
  });
}

export async function signOutUserAction(id: string) {
  return run(async () => {
    const me = await requireAdmin();
    const uid = targetId(id, me.id, "err.selfSignOut");
    await endSessionsForUser(uid);
    revalidatePath("/users");
    return null;
  });
}
