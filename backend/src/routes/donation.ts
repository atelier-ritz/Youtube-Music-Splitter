import express from 'express';
import Stripe from 'stripe';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// Initialize Stripe with your secret key (only if key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });
}

interface CreateCheckoutSessionRequest {
  amount: number; // Amount in cents
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for donations
 */
router.post('/create-checkout-session', async (req, res, next) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new AppError('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.', 503, 'STRIPE_NOT_CONFIGURED');
    }

    const { amount, currency = 'usd', successUrl, cancelUrl }: CreateCheckoutSessionRequest = req.body;

    // Validation
    if (!amount || amount < 50) { // Minimum $0.50
      throw new AppError('Amount must be at least $0.50', 400, 'INVALID_AMOUNT');
    }

    if (amount > 100000) { // Maximum $1000
      throw new AppError('Amount cannot exceed $1000', 400, 'AMOUNT_TOO_LARGE');
    }

    if (!successUrl || !cancelUrl) {
      throw new AppError('Success and cancel URLs are required', 400, 'MISSING_URLS');
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Band Practice Partner - Donation',
              description: 'Support the development of Band Practice Partner',
              images: ['https://your-domain.com/logo.png'], // Optional: Add your logo
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'donation',
        timestamp: new Date().toISOString(),
      },
      // Optional: Collect customer email for receipts
      customer_email: undefined, // Let Stripe collect it
      // Optional: Add custom fields
      custom_fields: [
        {
          key: 'message',
          label: {
            type: 'custom',
            custom: 'Message (optional)',
          },
          type: 'text',
          optional: true,
        },
      ],
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      next(new AppError(`Payment processing error: ${error.message}`, 400, 'STRIPE_ERROR'));
    } else if (error instanceof Error) {
      next(new AppError(`Payment processing error: ${error.message}`, 400, 'STRIPE_ERROR'));
    } else {
      next(new AppError('Payment processing error occurred', 400, 'STRIPE_ERROR'));
    }
  }
});

/**
 * Webhook endpoint for Stripe events
 * This is called by Stripe when payment events occur
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  // Check if Stripe is configured
  if (!stripe) {
    console.error('Stripe webhook called but Stripe is not configured');
    return res.status(503).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Donation completed:', {
          sessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          customerEmail: session.customer_email,
          metadata: session.metadata,
        });
        
        // Here you could:
        // - Send a thank you email
        // - Log the donation to your database
        // - Update user benefits if applicable
        // - Send analytics events
        
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        console.log('Donation session expired:', expiredSession.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    next(error);
  }
});

/**
 * Get donation statistics (optional)
 */
router.get('/stats', async (req, res, next) => {
  try {
    // This is optional - you could track donation stats
    // For now, just return a simple response
    res.json({
      success: true,
      message: 'Thank you for considering a donation!',
      totalDonors: '🎵', // You could track this in a database
    });
  } catch (error) {
    next(error);
  }
});

export default router;