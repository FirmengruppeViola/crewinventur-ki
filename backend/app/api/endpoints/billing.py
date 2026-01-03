"""
Billing API endpoints.

These endpoints are prepared for Stripe integration.
Currently returns Free plan for all users until Stripe is configured.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.supabase import get_supabase
from app.schemas.billing import (
    PLANS,
    SubscriptionOut,
    PlanInfo,
    CreateCheckoutRequest,
    CheckoutSessionOut,
    CustomerPortalRequest,
    CustomerPortalOut,
)
from app.services.stripe_service import (
    is_stripe_configured,
    create_checkout_session,
    create_customer_portal_session,
    get_or_create_customer,
    construct_webhook_event,
)

router = APIRouter()


@router.get("/billing/subscription", response_model=SubscriptionOut)
async def get_subscription(current_user=Depends(get_current_user)):
    """Get current user's subscription status."""
    supabase = get_supabase()

    # Try to get existing subscription
    response = (
        supabase.table("subscriptions")
        .select("*")
        .eq("user_id", current_user.id)
        .execute()
    )

    if response.data:
        sub = response.data[0]
        return SubscriptionOut(
            plan=sub.get("plan", "free"),
            status=sub.get("status", "active"),
            current_period_end=sub.get("current_period_end"),
            cancel_at_period_end=sub.get("cancel_at_period_end", False),
            stripe_customer_id=sub.get("stripe_customer_id"),
        )

    # No subscription exists - create free plan
    supabase.table("subscriptions").insert({
        "user_id": current_user.id,
        "plan": "free",
        "status": "active",
    }).execute()

    return SubscriptionOut(
        plan="free",
        status="active",
        current_period_end=None,
        cancel_at_period_end=False,
        stripe_customer_id=None,
    )


@router.get("/billing/plans", response_model=list[PlanInfo])
async def get_plans(current_user=Depends(get_current_user)):
    """Get available plans with current plan marked."""
    supabase = get_supabase()

    # Get current plan
    response = (
        supabase.table("subscriptions")
        .select("plan")
        .eq("user_id", current_user.id)
        .execute()
    )
    current_plan = response.data[0]["plan"] if response.data else "free"

    # Return plans with current marked
    plans = []
    for plan_id, plan in PLANS.items():
        plan_copy = plan.model_copy()
        plan_copy.is_current = (plan_id == current_plan)
        plans.append(plan_copy)

    return plans


@router.post("/billing/checkout", response_model=CheckoutSessionOut)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user=Depends(get_current_user),
):
    """Create a Stripe Checkout session for upgrading to Pro."""
    if not is_stripe_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing ist noch nicht aktiviert. Bitte später erneut versuchen.",
        )

    # Get or create Stripe customer
    customer_id = await get_or_create_customer(
        user_id=current_user.id,
        email=current_user.email,
    )

    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kunde konnte nicht erstellt werden.",
        )

    # Create checkout session
    session = await create_checkout_session(
        customer_id=customer_id,
        price_id=request.price_id,
        success_url=request.success_url,
        cancel_url=request.cancel_url,
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout-Session konnte nicht erstellt werden.",
        )

    return CheckoutSessionOut(
        session_id=session["id"],
        url=session["url"],
    )


@router.post("/billing/portal", response_model=CustomerPortalOut)
async def create_portal_session(
    request: CustomerPortalRequest,
    current_user=Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for managing subscription."""
    if not is_stripe_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing ist noch nicht aktiviert.",
        )

    supabase = get_supabase()

    # Get Stripe customer ID
    response = (
        supabase.table("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", current_user.id)
        .execute()
    )

    if not response.data or not response.data[0].get("stripe_customer_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein aktives Abo gefunden.",
        )

    customer_id = response.data[0]["stripe_customer_id"]

    portal_url = await create_customer_portal_session(
        customer_id=customer_id,
        return_url=request.return_url,
    )

    if not portal_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Portal-Session konnte nicht erstellt werden.",
        )

    return CustomerPortalOut(url=portal_url)


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks.

    Important events:
    - checkout.session.completed: Upgrade successful
    - customer.subscription.updated: Plan changed
    - customer.subscription.deleted: Subscription canceled
    - invoice.payment_failed: Payment failed
    """
    if not is_stripe_configured():
        return {"status": "ignored", "reason": "Stripe not configured"}

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    event = construct_webhook_event(payload, sig_header)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    supabase = get_supabase()

    if event_type == "checkout.session.completed":
        # User completed checkout - upgrade their plan
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        if customer_id:
            supabase.table("subscriptions").update({
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "plan": "pro",
                "status": "active",
            }).eq("stripe_customer_id", customer_id).execute()

    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        status = data.get("status")
        cancel_at_period_end = data.get("cancel_at_period_end", False)

        supabase.table("subscriptions").update({
            "status": status,
            "cancel_at_period_end": cancel_at_period_end,
            "current_period_end": data.get("current_period_end"),
        }).eq("stripe_subscription_id", subscription_id).execute()

    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")

        supabase.table("subscriptions").update({
            "plan": "free",
            "status": "canceled",
            "stripe_subscription_id": None,
        }).eq("stripe_subscription_id", subscription_id).execute()

    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")

        supabase.table("subscriptions").update({
            "status": "past_due",
        }).eq("stripe_subscription_id", subscription_id).execute()

    return {"status": "success"}
