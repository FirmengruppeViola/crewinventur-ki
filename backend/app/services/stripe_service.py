"""
Stripe Service - Prepared for integration.

To enable Stripe:
1. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to environment
2. Create Products and Prices in Stripe Dashboard
3. Update STRIPE_PRICES dict with actual Price IDs
4. Uncomment the stripe import and API calls

For now, this returns mock data for the Free plan.
"""

from app.core.config import settings

# Uncomment when Stripe is configured:
# import stripe
# stripe.api_key = settings.STRIPE_SECRET_KEY

# Stripe Price IDs - Update with actual IDs from Stripe Dashboard
STRIPE_PRICES = {
    "pro_monthly": "price_XXXXXXXXXXXXXXXX",  # €9.99/month
    "pro_yearly": "price_YYYYYYYYYYYYYYYY",   # €99/year (optional)
}


def is_stripe_configured() -> bool:
    """Check if Stripe is properly configured."""
    return bool(
        getattr(settings, 'STRIPE_SECRET_KEY', None) and
        getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
    )


async def get_or_create_customer(user_id: str, email: str) -> str | None:
    """
    Get or create a Stripe customer for the user.
    Returns customer ID or None if Stripe not configured.
    """
    if not is_stripe_configured():
        return None

    # TODO: Implement when Stripe is configured
    # customer = stripe.Customer.create(
    #     email=email,
    #     metadata={"user_id": user_id}
    # )
    # return customer.id
    return None


async def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
) -> dict | None:
    """
    Create a Stripe Checkout session for subscription.
    Returns session dict with id and url.
    """
    if not is_stripe_configured():
        return None

    # TODO: Implement when Stripe is configured
    # session = stripe.checkout.Session.create(
    #     customer=customer_id,
    #     payment_method_types=['card'],
    #     line_items=[{'price': price_id, 'quantity': 1}],
    #     mode='subscription',
    #     success_url=success_url,
    #     cancel_url=cancel_url,
    # )
    # return {"id": session.id, "url": session.url}
    return None


async def create_customer_portal_session(
    customer_id: str,
    return_url: str,
) -> str | None:
    """
    Create a Stripe Customer Portal session.
    Returns portal URL.
    """
    if not is_stripe_configured():
        return None

    # TODO: Implement when Stripe is configured
    # session = stripe.billing_portal.Session.create(
    #     customer=customer_id,
    #     return_url=return_url,
    # )
    # return session.url
    return None


async def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> bool:
    """
    Cancel a subscription.
    If at_period_end=True, cancels at end of billing period.
    """
    if not is_stripe_configured():
        return False

    # TODO: Implement when Stripe is configured
    # stripe.Subscription.modify(
    #     subscription_id,
    #     cancel_at_period_end=at_period_end
    # )
    # return True
    return False


def construct_webhook_event(payload: bytes, sig_header: str) -> dict | None:
    """
    Verify and construct webhook event from Stripe.
    """
    if not is_stripe_configured():
        return None

    # TODO: Implement when Stripe is configured
    # try:
    #     event = stripe.Webhook.construct_event(
    #         payload,
    #         sig_header,
    #         settings.STRIPE_WEBHOOK_SECRET
    #     )
    #     return event
    # except stripe.error.SignatureVerificationError:
    #     return None
    return None
