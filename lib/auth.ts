import { getServerSession } from "next-auth/next";
import { prisma } from "./prisma";

// Auth helper using NextAuth
export async function auth() {
  try {
    const session = await getServerSession();
    return session;
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return null;
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    return user;
  } catch (e) {
    console.error("Get current user error:", e);
    return null;
  }
}
