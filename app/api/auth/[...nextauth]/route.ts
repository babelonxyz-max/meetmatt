import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
import { generateAffiliateCode } from "@/lib/affiliate";

const config = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Github({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.affiliateCode = user.affiliateCode;
        session.user.stripeCustomerId = user.stripeCustomerId;
      }
      return session;
    },
    async signIn({ user }: { user: any }) {
      if (!user.affiliateCode) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { affiliateCode: generateAffiliateCode() },
          });
        } catch (e) {
          console.error("Failed to generate affiliate code:", e);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database" as const,
  },
  debug: process.env.NODE_ENV === "development",
};

const nextAuthHandler = NextAuth(config);

export const GET = nextAuthHandler as any;
export const POST = nextAuthHandler as any;
