# Stripe Donation Integration Setup Guide

This guide will help you set up Stripe for accepting donations on your Band Practice Partner website.

## 🎯 Overview

The donation system includes:
- **Frontend**: Beautiful, non-intrusive donation banner with preset amounts
- **Backend**: Secure Stripe Checkout integration with webhook handling
- **Features**: Custom amounts, secure payments, optional messages, email receipts

## 📋 Prerequisites

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Business Information**: You'll need to provide business details to Stripe
3. **Bank Account**: For receiving donations (can be personal account)

## 🔧 Setup Steps

### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete your account setup and business verification
3. Navigate to the Stripe Dashboard

### Step 2: Get API Keys
1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_test_` for testing)
3. Copy your **Secret key** (starts with `sk_test_` for testing)

### Step 3: Configure Environment Variables
1. Copy `backend/.env.example` to `backend/.env`
2. Add your Stripe keys:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 4: Set Up Webhook (Optional but Recommended)
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://your-domain.com/api/donate/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the **Signing secret** and add it to your `.env` file

### Step 5: Test the Integration
1. Start your backend server: `npm run dev`
2. Start your frontend: `npm run dev`
3. Visit your website and test the donation banner
4. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`

## 🚀 Deployment

### Railway Deployment
1. Add environment variables in Railway dashboard:
   - Go to your project → **Variables**
   - Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

2. Update webhook URL to your production domain:
   - `https://your-railway-app.up.railway.app/api/donate/webhook`

### Custom Domain (Recommended)
1. Set up a custom domain in Railway
2. Update webhook URL to use your custom domain
3. Update success/cancel URLs in the frontend

## 💰 Donation Amounts

The banner includes preset amounts:
- **$5**: "Buy me a coffee ☕"
- **$10**: "Support development 🚀"
- **$25**: "Sponsor a feature ⭐"
- **$50**: "Become a patron 🎵"
- **Custom**: User can enter any amount

## 🎨 Customization

### Modify Donation Amounts
Edit `frontend/src/components/DonationBanner.tsx`:
```typescript
const donationAmounts = [
  { amount: 5, label: '$5', description: 'Buy me a coffee ☕' },
  { amount: 10, label: '$10', description: 'Support development 🚀' },
  // Add or modify amounts here
];
```

### Styling
Edit `frontend/src/components/DonationBanner.css` to match your brand colors.

### Banner Behavior
- Shows only on main page when idle (not processing)
- Can be minimized or closed by users
- Remembers user preference during session

## 🔒 Security Features

- **Webhook Verification**: Ensures requests are from Stripe
- **Amount Validation**: Prevents invalid amounts ($0.50 - $1000)
- **Rate Limiting**: Protects against abuse
- **HTTPS Required**: Secure payment processing
- **No Card Data**: Never touches your servers

## 📊 Monitoring

### Stripe Dashboard
- View all donations in **Payments**
- Track revenue in **Analytics**
- Manage disputes in **Disputes**
- Download reports in **Reports**

### Backend Logs
The webhook logs successful donations:
```
Donation completed: {
  sessionId: 'cs_...',
  amount: 1000, // $10.00 in cents
  currency: 'usd',
  customerEmail: 'donor@example.com'
}
```

## 🎯 Going Live

### Switch to Live Mode
1. In Stripe Dashboard, toggle to **Live mode**
2. Get your live API keys (start with `sk_live_` and `pk_live_`)
3. Update environment variables with live keys
4. Update webhook endpoint to use live keys
5. Test with real (small) amounts

### Business Requirements
- Complete Stripe account verification
- Provide business information
- Set up bank account for payouts
- Review Stripe's terms of service

## 🆘 Troubleshooting

### Common Issues

**"Invalid API Key"**
- Check that you're using the correct key for your mode (test/live)
- Ensure no extra spaces in environment variables

**"Webhook signature verification failed"**
- Verify webhook secret is correct
- Check that webhook URL is accessible
- Ensure raw body is passed to webhook handler

**"Amount too small/large"**
- Minimum: $0.50 (50 cents)
- Maximum: $1000 (configurable in code)

### Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Require 3D Secure**: `4000 0025 0000 3155`

## 📞 Support

- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Test Your Integration**: Use Stripe's testing tools

## 🎉 Success!

Once set up, your users can:
- ✅ Make secure donations via Stripe Checkout
- ✅ Choose preset amounts or enter custom amounts
- ✅ Add optional messages
- ✅ Receive email receipts automatically
- ✅ Use any payment method Stripe supports

The donation banner is designed to be helpful but never intrusive - users can minimize or close it, and it only appears when appropriate.

Happy fundraising! 🎵💝