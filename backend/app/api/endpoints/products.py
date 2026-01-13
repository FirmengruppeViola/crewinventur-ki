from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import UserContext, get_current_user_context
from app.core.supabase import get_supabase
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.utils.query_helpers import escape_like_pattern, normalize_search_query

router = APIRouter()


@router.get("/products", response_model=list[ProductOut])
def list_products(
    current_user: UserContext = Depends(get_current_user_context),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category_id: str | None = None,
    q: str | None = None,
):
    supabase = get_supabase()
    start = (page - 1) * limit
    end = start + limit - 1

    tenant_user_id = current_user.effective_owner_id
    query = supabase.table("products").select("*").eq("user_id", tenant_user_id)

    if category_id:
        query = query.eq("category_id", category_id)
    if q:
        normalized_q = normalize_search_query(q)
        if normalized_q:
            query = query.ilike("name", escape_like_pattern(normalized_q))

    response = query.order("created_at", desc=True).range(start, end).execute()
    return response.data or []


@router.post(
    "/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED
)
def create_product(
    payload: ProductCreate,
    current_user: UserContext = Depends(get_current_user_context),
):
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can create products",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()
    response = (
        supabase.table("products")
        .insert({**payload.model_dump(), "user_id": tenant_user_id})
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Product creation failed",
        )
    return data


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    tenant_user_id = current_user.effective_owner_id
    response = (
        supabase.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("user_id", tenant_user_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return data


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    current_user: UserContext = Depends(get_current_user_context),
):
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can update products",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update",
        )

    response = (
        supabase.table("products")
        .update(update_data)
        .eq("id", product_id)
        .eq("user_id", tenant_user_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return data


@router.delete("/products/{product_id}", response_model=ProductOut)
def delete_product(
    product_id: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    if current_user.is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can delete products",
        )

    tenant_user_id = current_user.effective_owner_id

    supabase = get_supabase()
    response = (
        supabase.table("products")
        .delete()
        .eq("id", product_id)
        .eq("user_id", tenant_user_id)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return data


@router.get("/products/search", response_model=list[ProductOut])
def search_products(
    q: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    tenant_user_id = current_user.effective_owner_id

    normalized_q = normalize_search_query(q)
    if not normalized_q:
        return []

    response = (
        supabase.table("products")
        .select("*")
        .eq("user_id", tenant_user_id)
        .ilike("name", escape_like_pattern(normalized_q))
        .limit(20)
        .execute()
    )
    return response.data or []


@router.get("/products/barcode/{code}", response_model=ProductOut)
def get_by_barcode(
    code: str,
    current_user: UserContext = Depends(get_current_user_context),
):
    supabase = get_supabase()
    tenant_user_id = current_user.effective_owner_id

    response = (
        supabase.table("products")
        .select("*")
        .eq("user_id", tenant_user_id)
        .eq("barcode", code)
        .limit(1)
        .execute()
    )
    data = response.data[0] if response.data else None
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return data
