import { Hono } from "hono";
import { cors } from "hono/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = new Hono();

// Configure CORS
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);

app.post("/api/payments", async (c) => {
  try {
    const { payerId, recipientId, amount, description } = await c.req.json();

    const result = await prisma.$transaction(async (tx) => {
      // Check if users exist, if not create them
      const payer = await tx.user.upsert({
        where: { id: payerId },
        update: {},
        create: {
          id: payerId,
          username: `User${payerId}`,
          email: `user${payerId}@example.com`,
          password: "password",
        },
      });

      const recipient = await tx.user.upsert({
        where: { id: recipientId },
        update: {},
        create: {
          id: recipientId,
          username: `User${recipientId}`,
          email: `user${recipientId}@example.com`,
          password: "password",
        },
      });

      const payment = await tx.payment.create({
        data: {
          payer: { connect: { id: payer.id } },
          recipient: { connect: { id: recipient.id } },
          amount,
          description,
        },
      });

      await tx.balance.upsert({
        where: {
          userId_otherUserId: {
            userId: payer.id,
            otherUserId: recipient.id,
          },
        },
        update: {
          amount: { decrement: amount },
        },
        create: {
          userId: payer.id,
          otherUserId: recipient.id,
          amount: -amount,
        },
      });

      await tx.balance.upsert({
        where: {
          userId_otherUserId: {
            userId: recipient.id,
            otherUserId: payer.id,
          },
        },
        update: {
          amount: { increment: amount },
        },
        create: {
          userId: recipient.id,
          otherUserId: payer.id,
          amount: amount,
        },
      });

      return payment;
    });

    return c.json(result);
  } catch (error) {
    console.error("Transaction failed:", error);
    return c.json({ error: "Failed to process payment" }, 500);
  }
});

app.get("/api/balance/:userId/:otherUserId", async (c) => {
  const userId = parseInt(c.req.param("userId"));
  const otherUserId = parseInt(c.req.param("otherUserId"));

  try {
    const balance = await prisma.balance.findUnique({
      where: {
        userId_otherUserId: {
          userId,
          otherUserId,
        },
      },
    });
    return c.json(balance || { amount: 0 });
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    return c.json({ error: "Failed to fetch balance" }, 500);
  }
});

app.get("/api/transactions/:userId/:otherUserId", async (c) => {
  const userId = parseInt(c.req.param("userId"));
  const otherUserId = parseInt(c.req.param("otherUserId"));

  try {
    const transactions = await prisma.payment.findMany({
      where: {
        OR: [
          { payerId: userId, recipientId: otherUserId },
          { payerId: otherUserId, recipientId: userId },
        ],
      },
      orderBy: {
        date: "desc",
      },
      take: 10, // Limit to last 10 transactions
    });
    return c.json(transactions);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

export default app;
