import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
import { generateAffiliateCode } from "@/lib/affiliate";

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Github({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.affiliateCode = user.affiliateCode;
        session.user.stripeCustomerId = user.stripeCustomerId;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.affiliateCode) {
        await prisma.user.update({
          where: { id: user.id },
          data: { affiliateCode: generateAffiliateCode() },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
});

export const GET = nextAuth.handlers.GET;
export const POST = nextAuth.handlers.POST;
export const auth = nextAuth.auth;
