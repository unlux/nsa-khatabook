import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = new Hono();

app.post("/api/payments", async (c) => {
  const { payerId, recipientId, amount, description } = await c.req.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          payer: { connect: { id: payerId } },
          recipient: { connect: { id: recipientId } },
          amount,
          description,
        },
      });

      // Update or create the balance record for the payer
      await tx.balance.upsert({
        where: {
          userId_otherUserId: {
            userId: payerId,
            otherUserId: recipientId,
          },
        },
        update: {
          amount: { decrement: amount },
        },
        create: {
          userId: payerId,
          otherUserId: recipientId,
          amount: -amount,
        },
      });

      // Update or create the balance record for the recipient
      await tx.balance.upsert({
        where: {
          userId_otherUserId: {
            userId: recipientId,
            otherUserId: payerId,
          },
        },
        update: {
          amount: { increment: amount },
        },
        create: {
          userId: recipientId,
          otherUserId: payerId,
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
    return c.json(balance);
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    return c.json({ error: "Failed to fetch balance" }, 500);
  }
});

export default app;
