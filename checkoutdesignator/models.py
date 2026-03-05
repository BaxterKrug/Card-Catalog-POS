from datetime import date, datetime
from zoneinfo import ZoneInfo
from enum import Enum
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    """Return current datetime in Chicago timezone."""
    return datetime.now(ZoneInfo("America/Chicago"))


class ProductCategory(str, Enum):
    SINGLE = "single"
    SEALED = "sealed"
    SUPPLY = "supply"
    OTHER = "other"


class InventorySource(str, Enum):
    PLAYER = "player"
    SUPPLIER = "supplier"


class OrderStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    READY = "ready"
    PICKED_UP = "picked_up"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PreorderClaimStatus(str, Enum):
    WAITING = "waiting"
    ALLOCATED = "allocated"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class AdjustmentReason(str, Enum):
    RECEIVE = "receive"
    CORRECTION = "correction"
    DAMAGE = "damage"
    SALE = "sale"
    RETURN = "return"


class UserRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class PaymentMethod(str, Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    STORE_CREDIT = "store_credit"
    CHECK = "check"
    CASHAPP = "cashapp"
    VENMO = "venmo"
    OTHER = "other"


class DiscountType(str, Enum):
    STUDENT = "student"
    FIRST_RESPONDER = "first_responder"
    MILITARY = "military"
    SENIOR = "senior"
    EMPLOYEE = "employee"
    CUSTOM = "custom"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.EMPLOYEE, index=True)
    title: Optional[str] = None
    email: Optional[str] = Field(default=None, index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    checklist_completions: List["ChecklistCompletion"] = Relationship(back_populates="user")


class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None)
    discord_id: Optional[str] = Field(default=None)
    default_discount_type: Optional[DiscountType] = Field(default=None)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    orders: List["Order"] = Relationship(back_populates="customer")
    preorder_orders: List["PreorderOrder"] = Relationship(back_populates="customer")
    preorder_claims: List["PreorderClaim"] = Relationship(back_populates="customer")


class InventoryItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sku: str = Field(index=True, unique=True)
    name: str
    category: ProductCategory = Field(default=ProductCategory.SINGLE, index=True)
    source: InventorySource = Field(default=InventorySource.SUPPLIER, index=True)
    game_title: Optional[str] = Field(default=None, index=True)
    acquisition_reference: Optional[str] = None
    set_code: Optional[str] = Field(default=None, index=True)
    printing: Optional[str] = None
    condition: Optional[str] = None
    msrp_cents: Optional[int] = Field(default=None, ge=0)
    acquisition_cost_cents: Optional[int] = Field(default=None, ge=0)
    unit_price_cents: int = Field(default=0, ge=0)
    physical_quantity: int = Field(default=0, ge=0)
    # Note: allocated_quantity is deprecated - pre-orders have separate inventory
    allocated_quantity: int = Field(default=0, ge=0)  
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    order_items: List["OrderItem"] = Relationship(back_populates="inventory_item")
    preorder_items: List["PreorderItem"] = Relationship(back_populates="inventory_item")
    adjustments: List["InventoryAdjustment"] = Relationship(back_populates="inventory_item")

    @property
    def available_quantity(self) -> int:
        # For live catalog, available = physical (pre-orders are tracked separately)
        return self.physical_quantity


class InventoryAdjustment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    inventory_item_id: int = Field(foreign_key="inventoryitem.id")
    delta: int
    reason: AdjustmentReason = Field(default=AdjustmentReason.CORRECTION)
    note: Optional[str] = None
    actor: str = Field(default="system")
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    inventory_item: Optional[InventoryItem] = Relationship(back_populates="adjustments")


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id")
    status: OrderStatus = Field(default=OrderStatus.DRAFT, index=True)
    notes: Optional[str] = None
    
    # Financial fields (all in cents)
    subtotal_cents: int = Field(default=0, ge=0)  # Sum of all items before discount
    discount_type: Optional[DiscountType] = None
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    discount_amount_cents: int = Field(default=0, ge=0)
    tax_rate_percent: float = Field(default=8.25, ge=0.0)  # Default 8.25%
    tax_amount_cents: int = Field(default=0, ge=0)
    card_fee_percent: float = Field(default=0.0, ge=0.0)  # 2.9% if using card
    card_fee_amount_cents: int = Field(default=0, ge=0)
    total_cents: int = Field(default=0, ge=0)  # Final total after all adjustments
    
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    customer: Optional[Customer] = Relationship(back_populates="orders")
    items: List["OrderItem"] = Relationship(back_populates="order")
    payments: List["OrderPayment"] = Relationship(back_populates="order")


class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    inventory_item_id: int = Field(foreign_key="inventoryitem.id")
    quantity: int = Field(ge=1)
    unit_price_cents: int = Field(ge=0)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    order: Optional[Order] = Relationship(back_populates="items")
    inventory_item: Optional[InventoryItem] = Relationship(back_populates="order_items")


class OrderPayment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    payment_method: PaymentMethod
    amount_cents: int = Field(ge=0)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    order: Optional[Order] = Relationship(back_populates="payments")


class PreorderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    inventory_item_id: int = Field(foreign_key="inventoryitem.id")
    release_date: Optional[date] = Field(default=None)
    
    # Separate inventory tracking for preorders
    preorder_quantity: int = Field(default=0, ge=0)  # Total stock allocated to this preorder
    preorder_quantity_allocated: int = Field(default=0, ge=0)  # Amount claimed by customers
    
    quantity_cap: Optional[int] = Field(default=None, ge=1)  # Max claims allowed (can differ from preorder_quantity)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    inventory_item: Optional[InventoryItem] = Relationship(back_populates="preorder_items")
    claims: List["PreorderClaim"] = Relationship(back_populates="preorder_item")
    
    @property
    def preorder_available_quantity(self) -> int:
        """Available preorder stock not yet claimed."""
        return self.preorder_quantity - self.preorder_quantity_allocated


class PreorderOrder(SQLModel, table=True):
    """Groups all preorder claims for a customer into a single order."""
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    status: PreorderClaimStatus = Field(default=PreorderClaimStatus.WAITING, index=True)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    customer: Optional[Customer] = Relationship(back_populates="preorder_orders")
    claims: List["PreorderClaim"] = Relationship(back_populates="preorder_order")


class PreorderClaim(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    preorder_order_id: int = Field(foreign_key="preorderorder.id", index=True)
    preorder_item_id: int = Field(foreign_key="preorderitem.id")
    customer_id: int = Field(foreign_key="customer.id")
    quantity_requested: int = Field(ge=1)
    quantity_allocated: int = Field(default=0, ge=0)
    status: PreorderClaimStatus = Field(default=PreorderClaimStatus.WAITING, index=True)
    
    # Payment tracking (stored in perpetuity)
    is_paid: bool = Field(default=False, index=True)
    payment_amount_cents: Optional[int] = Field(default=None, ge=0)
    payment_method: Optional[PaymentMethod] = Field(default=None)
    payment_date: Optional[datetime] = Field(default=None)
    payment_notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    preorder_order: Optional[PreorderOrder] = Relationship(back_populates="claims")
    preorder_item: Optional[PreorderItem] = Relationship(back_populates="claims")
    customer: Optional[Customer] = Relationship(back_populates="preorder_claims")


class BuylistTransaction(SQLModel, table=True):
    """Track purchases of singles from community members"""
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    amount_cents: int = Field(ge=0)  # Amount paid/credited to customer
    payment_method: PaymentMethod = Field(index=True)  # cash or store_credit
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)


class ChecklistCategory(str, Enum):
    OPENING = "opening"
    CLOSING = "closing"
    MAINTENANCE = "maintenance"


class ChecklistTemplate(SQLModel, table=True):
    """Template for checklist items that reset daily"""
    id: Optional[int] = Field(default=None, primary_key=True)
    category: ChecklistCategory = Field(index=True)
    task_name: str
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False)

    completions: List["ChecklistCompletion"] = Relationship(back_populates="template")


class ChecklistCompletion(SQLModel, table=True):
    """Track who completed which checklist items and when"""
    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: int = Field(foreign_key="checklisttemplate.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    completion_date: date = Field(index=True)  # Date the task was for (not when completed)
    completed_at: datetime = Field(default_factory=utcnow, nullable=False)
    notes: Optional[str] = None

    template: Optional[ChecklistTemplate] = Relationship(back_populates="completions")
    user: Optional["User"] = Relationship(back_populates="checklist_completions")


class CashRegisterTransactionType(str, Enum):
    STARTING_CASH = "starting_cash"
    SALE = "sale"  # Money coming in from sales
    BUYLIST_PAYOUT = "buylist_payout"  # Money going out for buylist
    DEPOSIT = "deposit"  # Money removed to bank
    ADJUSTMENT = "adjustment"  # Manual adjustment


class CashRegisterSession(SQLModel, table=True):
    """Track cash register sessions (typically one per day)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    opened_by_user_id: int = Field(foreign_key="user.id", index=True)
    opening_balance_cents: int = Field(ge=0)  # Starting cash
    current_balance_cents: int = Field(ge=0)  # Current cash in register
    opened_at: datetime = Field(default_factory=utcnow, nullable=False)
    closed_at: Optional[datetime] = None
    is_active: bool = Field(default=True, index=True)
    notes: Optional[str] = None

    transactions: List["CashRegisterTransaction"] = Relationship(back_populates="session")
    opened_by: Optional["User"] = Relationship()


class CashRegisterTransaction(SQLModel, table=True):
    """Track individual cash register transactions"""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="cashregistersession.id", index=True)
    transaction_type: CashRegisterTransactionType = Field(index=True)
    amount_cents: int  # Positive for money in, negative for money out
    description: str
    reference_type: Optional[str] = None  # e.g., "order", "buylist", "preorder"
    reference_id: Optional[int] = None
    created_by_user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utcnow, nullable=False)
    notes: Optional[str] = None

    session: Optional[CashRegisterSession] = Relationship(back_populates="transactions")
    created_by: Optional["User"] = Relationship()
