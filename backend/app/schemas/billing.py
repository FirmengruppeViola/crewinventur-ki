from pydantic import BaseModel
from datetime import datetime


class PlanInfo(BaseModel):
    """Plan details for display."""
    id: str
    name: str
    price: float  # Monthly price in EUR
    currency: str = "EUR"
    features: list[str]
    is_current: bool = False


class SubscriptionOut(BaseModel):
    """Current subscription status."""
    plan: str  # 'free', 'pro', 'enterprise'
    status: str  # 'active', 'canceled', 'past_due', 'trialing'
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    stripe_customer_id: str | None = None


class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    price_id: str  # Stripe Price ID
    success_url: str
    cancel_url: str


class CheckoutSessionOut(BaseModel):
    """Checkout session response."""
    session_id: str
    url: str


class CustomerPortalRequest(BaseModel):
    """Request to create customer portal session."""
    return_url: str


class CustomerPortalOut(BaseModel):
    """Customer portal response."""
    url: str


# Plan definitions (used for display, actual prices in Stripe)
PLANS = {
    "free": PlanInfo(
        id="free",
        name="Free",
        price=0,
        features=[
            "1 Standort",
            "50 Produkte",
            "5 Inventuren pro Monat",
            "PDF Export",
        ]
    ),
    "pro": PlanInfo(
        id="pro",
        name="Pro",
        price=9.99,
        features=[
            "Unbegrenzte Standorte",
            "Unbegrenzte Produkte",
            "Unbegrenzte Inventuren",
            "PDF & CSV Export",
            "Email-Versand an Steuerberater",
            "Team-Verwaltung",
            "Prioritäts-Support",
        ]
    ),
    "enterprise": PlanInfo(
        id="enterprise",
        name="Enterprise",
        price=0,  # Custom pricing
        features=[
            "Alles aus Pro",
            "Multi-Tenant",
            "API-Zugang",
            "Dedizierter Support",
            "Custom Integrationen",
        ]
    ),
}
