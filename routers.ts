import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { createBooking, getBookings, updateBookingStatus } from "./db";
import { notifyOwner } from "./_core/notification";

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

  bookings: router({
    create: publicProcedure
      .input(z.object({
        serviceType: z.string(),
        quantity: z.string(),
        price: z.string(),
        customerName: z.string(),
        customerEmail: z.string(),
        customerPhone: z.string(),
        serviceDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const booking = await createBooking({
          customerId: 0,
          serviceType: input.serviceType,
          quantity: input.quantity,
          price: input.price,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          serviceDate: input.serviceDate,
          notes: input.notes,
          status: "pending",
        });
        
        // Send notification to owner
        await notifyOwner({
          title: "New Booking Request",
          content: `New booking from ${input.customerName}\nService: ${input.serviceType} (${input.quantity})\nPrice: ${input.price}\nPhone: ${input.customerPhone}\nEmail: ${input.customerEmail}`,
        });
        
        return booking;
      }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can view all bookings
      if (ctx.user?.role !== "admin") {
        throw new Error("Unauthorized");
      }
      return await getBookings();
    }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can update booking status
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        await updateBookingStatus(input.id, input.status);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
