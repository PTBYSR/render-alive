import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import redis from "@/lib/redis";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...((process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
    (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret:
              process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Find existing user by email in Redis
        const existingUserId = await redis.get(`email_to_uid:${email}`);
        if (existingUserId) {
          const user = await redis.hgetall(`user:${existingUserId}`);
          if (!user || !user.passwordHash) return null;
          const match = bcrypt.compareSync(password, user.passwordHash);
          if (!match) return null;
          return { id: existingUserId, email: user.email, name: user.name };
        } else {
          // Auto-register new user
          const newUserId = "usr_" + crypto.randomUUID().slice(0, 12);
          const passwordHash = bcrypt.hashSync(password, 10);
          const newUser = {
            id: newUserId,
            email,
            name: email.split("@")[0],
            passwordHash,
            createdAt: String(Date.now()),
          };
          await redis.hset(`user:${newUserId}`, newUser);
          await redis.set(`email_to_uid:${email}`, newUserId);
          await redis.sadd("all_users", newUserId);
          return { id: newUserId, email: newUser.email, name: newUser.name };
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      // For Google OAuth, ensure a consistent user ID in Redis
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase().trim();
        let uid = await redis.get(`email_to_uid:${email}`);
        if (!uid) {
          uid = "usr_" + crypto.randomUUID().slice(0, 12);
          const googleUser = {
            id: uid,
            email,
            name: profile.name || email.split("@")[0],
            image: profile.picture || "",
            createdAt: String(Date.now()),
          };
          await redis.hset(`user:${uid}`, googleUser);
          await redis.set(`email_to_uid:${email}`, uid);
          await redis.sadd("all_users", uid);
        }
        token.id = uid;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret:
    process.env.AUTH_SECRET ||
    process.env.CRON_SECRET ||
    "render-alive-auth-secret-key-32chars",
  trustHost: true,
});
