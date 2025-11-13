import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { projectsRouter } from "./routers/projects";
import { categoriesRouter } from "./routers/categories";
import { timeEntriesRouter } from "./routers/timeEntries";
import { invoicesRouter } from "./routers/invoices";
import { usersRouter } from "./routers/users";
import { localAuthRouter } from "./routers/localAuth";
import { auditLogsRouter } from "./routers/auditLogs";
import { userProjectQuotasRouter } from "./routers/userProjectQuotas";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  projects: projectsRouter,
  categories: categoriesRouter,
  timeEntries: timeEntriesRouter,
  invoices: invoicesRouter,
  users: usersRouter,
  localAuth: localAuthRouter,
  auditLogs: auditLogsRouter,
  userProjectQuotas: userProjectQuotasRouter,
});

export type AppRouter = typeof appRouter;
