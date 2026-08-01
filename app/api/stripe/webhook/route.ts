import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

/**
 * Stripe Webhook Handler.
 *
 * CONFIG: Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables.
 * In Stripe Dashboard, set the webhook endpoint to /api/stripe/webhook.
 *
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          await prisma.profile.update({
            where: { id: userId },
            data: { plan: 'pro', creditsRemaining: 999999 },
          });
          await prisma.subscription.upsert({
            where: { stripeSubscriptionId: session.subscription as string },
            create: {
              userId,
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              status: 'active',
              plan: 'pro',
            },
            update: { status: 'active', plan: 'pro' },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: sub.status, currentPeriodEnd: new Date((sub as any).current_period_end * 1000) },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'canceled', plan: 'free' },
        });
        const subRecord = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (subRecord) {
          await prisma.profile.update({ where: { id: subRecord.userId }, data: { plan: 'free', creditsRemaining: 5 } });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
