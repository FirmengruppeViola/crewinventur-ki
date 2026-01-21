from fastapi import APIRouter
from app.api.endpoints import (
    ai,
    billing,
    bundles,
    categories,
    export,
    inventory,
    inventory_scan,
    invoices,
    locations,
    products,
    profile,
    reorder,
    team,
    unit_sizes,
)

api_router = APIRouter()

api_router.include_router(profile.router, tags=["profile"])
api_router.include_router(locations.router, tags=["locations"])
api_router.include_router(categories.router, tags=["categories"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(ai.router, tags=["ai"])
api_router.include_router(inventory.router, tags=["inventory"])
api_router.include_router(inventory_scan.router, tags=["inventory-scan"])
api_router.include_router(invoices.router, tags=["invoices"])
api_router.include_router(export.router, tags=["export"])
api_router.include_router(bundles.router, tags=["bundles"])
api_router.include_router(reorder.router, tags=["reorder"])
api_router.include_router(team.router, prefix="/team", tags=["team"])
api_router.include_router(billing.router, tags=["billing"])
api_router.include_router(unit_sizes.router, tags=["unit-sizes"])
