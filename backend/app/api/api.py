from fastapi import APIRouter
from app.api.endpoints import profile, locations, categories, products, ai, inventory, invoices, export

api_router = APIRouter()

api_router.include_router(profile.router, tags=["profile"])
api_router.include_router(locations.router, tags=["locations"])
api_router.include_router(categories.router, tags=["categories"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(ai.router, tags=["ai"])
api_router.include_router(inventory.router, tags=["inventory"])
api_router.include_router(invoices.router, tags=["invoices"])
api_router.include_router(export.router, tags=["export"])
