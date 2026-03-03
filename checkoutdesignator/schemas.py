from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from pydantic import ConfigDict

from .models import (
    AdjustmentReason,
    DiscountType,
    InventorySource,
    OrderStatus,
    PaymentMethod,
    PreorderClaimStatus,
    ProductCategory,
    UserRole,
)


class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    discord_id: Optional[str] = None
    default_discount_type: Optional[DiscountType] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    discord_id: Optional[str] = None
    default_discount_type: Optional[DiscountType] = None
    notes: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: UserRole = UserRole.EMPLOYEE
    title: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    title: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    role: UserRole
    title: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    user: UserRead
    token: str


class InventoryCreate(BaseModel):
    sku: str
    name: str
    category: ProductCategory = ProductCategory.SINGLE
    source: Optional[InventorySource] = None
    set_code: Optional[str] = None
    printing: Optional[str] = None
    condition: Optional[str] = None
    game_title: Optional[str] = None
    acquisition_reference: Optional[str] = None
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    acquisition_cost_cents: Optional[int] = Field(default=None, ge=0)
    unit_price_cents: int = Field(default=0, ge=0)
    physical_quantity: int = Field(default=0, ge=0)


class InventoryBulkItem(BaseModel):
    sku: str
    name: str
    category: ProductCategory = ProductCategory.SINGLE
    source: Optional[InventorySource] = None
    set_code: Optional[str] = None
    printing: Optional[str] = None
    condition: Optional[str] = None
    game_title: Optional[str] = None
    acquisition_reference: Optional[str] = None
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    acquisition_cost_cents: Optional[int] = Field(default=None, ge=0)
    unit_price_cents: int = Field(default=0, ge=0)
    physical_quantity: int = Field(default=0, ge=0)


class InventoryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    category: ProductCategory
    source: InventorySource
    set_code: Optional[str] = None
    printing: Optional[str] = None
    condition: Optional[str] = None
    game_title: Optional[str] = None
    acquisition_reference: Optional[str] = None
    msrp_cents: Optional[int] = None
    acquisition_cost_cents: Optional[int] = None
    unit_price_cents: int
    physical_quantity: int
    allocated_quantity: int
    available_quantity: int


class PriceSuggestion(BaseModel):
    name: str
    set_code: Optional[str] = None
    currency: str = "usd"
    msrp_cents: Optional[int] = None
    acquisition_cost_cents: Optional[int] = None
    source: str = "scryfall"
    source_url: Optional[str] = None
    note: Optional[str] = None


class InventoryAdjustmentRequest(BaseModel):
    delta: int
    reason: AdjustmentReason = AdjustmentReason.CORRECTION
    note: Optional[str] = None
    actor: str = "system"


class ReceiveInventoryRequest(BaseModel):
    quantity: int = Field(ge=1)
    note: Optional[str] = None
    actor: str = "system"


class BulkReceiveItem(BaseModel):
    inventory_item_id: int
    quantity: int = Field(ge=1)


class BulkReceiveInventoryRequest(BaseModel):
    items: list[BulkReceiveItem]
    note: Optional[str] = None
    actor: str = "system"


class OrderCreate(BaseModel):
    customer_id: int
    notes: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    tax_rate_percent: float = Field(default=8.25, ge=0.0)  # Default 8.25%


class OrderItemCreate(BaseModel):
    inventory_item_id: int
    quantity: int = Field(ge=1)
    unit_price_cents: Optional[int] = Field(default=None, ge=0)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    order_id: int
    inventory_item_id: int
    quantity: int
    unit_price_cents: int
    created_at: datetime
    updated_at: datetime


class OrderPaymentCreate(BaseModel):
    payment_method: PaymentMethod
    amount_cents: int = Field(ge=0)
    notes: Optional[str] = None


class OrderPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    order_id: int
    payment_method: PaymentMethod
    amount_cents: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    customer_id: int
    status: OrderStatus
    notes: Optional[str] = None
    subtotal_cents: int
    discount_type: Optional[DiscountType] = None
    discount_percent: float
    discount_amount_cents: int
    tax_rate_percent: float
    tax_amount_cents: int
    card_fee_percent: float
    card_fee_amount_cents: int
    total_cents: int
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemRead] = []
    payments: List[OrderPaymentRead] = []


class PreorderItemCreate(BaseModel):
    inventory_item_id: int
    release_date: Optional[date] = None
    preorder_quantity: int = Field(default=0, ge=0)  # Total preorder stock available
    notes: Optional[str] = None


class PreorderItemCreateWithProduct(BaseModel):
    """Create a preorder item along with a new inventory item for unreleased products."""
    # Product details
    product_name: str
    sku: str
    game_title: str
    category: ProductCategory = ProductCategory.SEALED
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    
    # Preorder details
    release_date: Optional[date] = None
    preorder_quantity: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class PreorderItemUpdate(BaseModel):
    release_date: Optional[date] = None
    preorder_quantity: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None
    # Inventory item updates
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    set_code: Optional[str] = None


class PreorderSetProduct(BaseModel):
    """Individual product in a pre-order set."""
    product_name: str
    sku: str
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    preorder_quantity: int = Field(default=0, ge=0)


class PreorderSetCreate(BaseModel):
    """Create multiple preorder items with shared game and release date."""
    # Shared details for all products in the set
    game_title: str
    release_date: Optional[date] = None
    category: ProductCategory = ProductCategory.SEALED
    notes: Optional[str] = None
    
    # Individual products in the set
    products: List[PreorderSetProduct] = Field(min_length=1)


class PreorderClaimCreate(BaseModel):
    preorder_item_id: int
    customer_id: int
    quantity_requested: int = Field(default=1, ge=1, le=1)  # Always 1


class PreorderClaimUpdate(BaseModel):
    quantity_requested: Optional[int] = Field(default=None, ge=1)
    quantity_allocated: Optional[int] = Field(default=None, ge=0)
    status: Optional[PreorderClaimStatus] = None


class PreorderClaimPaymentUpdate(BaseModel):
    is_paid: bool
    payment_amount_cents: int = Field(ge=0)
    payment_method: PaymentMethod
    payment_notes: Optional[str] = None


class PreorderClaimFulfillRequest(BaseModel):
    mark_picked_up: bool = True
    note: Optional[str] = None


class PreorderReleaseRequest(BaseModel):
    """Request to release preorder inventory to main inventory."""
    note: Optional[str] = None


class BulkCSVUpload(BaseModel):
    csv_data: str


class OrderSummary(BaseModel):
    id: int
    customer_id: int
    status: OrderStatus
    total_cents: int


class CustomerOrderResponse(BaseModel):
    customer_id: int
    orders: List[OrderSummary]


class PreorderClaimResponse(BaseModel):
    claim_id: int
    customer_id: int
    preorder_item_id: int
    quantity_requested: int
    quantity_allocated: int
    status: PreorderClaimStatus