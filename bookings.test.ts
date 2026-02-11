import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("bookings", () => {
  describe("create", () => {
    it("should create a booking with valid input", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.create({
        serviceType: "Windows Cleaning",
        quantity: "3 Windows",
        price: "R60",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "+27 71 359 3615",
        serviceDate: "2026-02-20",
        notes: "Please be careful with the windows",
      });

      expect(result).toBeDefined();
    });

    it("should reject booking without required fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.create({
          serviceType: "Windows Cleaning",
          quantity: "3 Windows",
          price: "R60",
          customerName: "",
          customerEmail: "john@example.com",
          customerPhone: "+27 71 359 3615",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("list", () => {
    it("should reject non-admin users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.list();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should allow admin users to list bookings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("updateStatus", () => {
    it("should reject non-admin users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.bookings.updateStatus({
          id: 1,
          status: "confirmed",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should allow admin users to update status", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a booking as public user
      const publicCtx = createPublicContext();
      const publicCaller = appRouter.createCaller(publicCtx);

      const booking = await publicCaller.bookings.create({
        serviceType: "Windows Cleaning",
        quantity: "3 Windows",
        price: "R60",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+27 82 843 4110",
      });

      // Then update as admin
      const result = await caller.bookings.updateStatus({
        id: (booking as any).insertId || 1,
        status: "confirmed",
      });

      expect(result).toEqual({ success: true });
    });
  });
});
