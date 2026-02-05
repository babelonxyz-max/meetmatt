import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      affiliateCode?: string | null;
      stripeCustomerId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    affiliateCode?: string | null;
    stripeCustomerId?: string | null;
  }
}
