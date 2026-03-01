from __future__ import annotations

from datetime import date
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from .config import get_settings
from .database import init_db, session_scope
from .exceptions import CardPosError
from .models import AdjustmentReason, InventorySource, OrderStatus, ProductCategory
from .schemas import (
    CustomerCreate,
    InventoryAdjustmentRequest,
    InventoryCreate,
    OrderCreate,
    OrderItemCreate,
    OrderStatusUpdate,
    PreorderClaimCreate,
    PreorderClaimFulfillRequest,
    PreorderItemCreate,
    ReceiveInventoryRequest,
    UserCreate,
)
from .services import customers, inventory, orders, preorders, users as users_service

app = typer.Typer(help="Command-line utilities for CheckoutDesignator")
customer_cli = typer.Typer(help="Manage customers")
inventory_cli = typer.Typer(help="Manage inventory")
orders_cli = typer.Typer(help="Manage orders")
preorders_cli = typer.Typer(help="Manage preorders")
users_cli = typer.Typer(help="Manage users")
app.add_typer(customer_cli, name="customers")
app.add_typer(inventory_cli, name="inventory")
app.add_typer(orders_cli, name="orders")
app.add_typer(preorders_cli, name="preorders")
app.add_typer(users_cli, name="users")
console = Console()
settings = get_settings()


def _handle_error(exc: CardPosError) -> None:
    console.print(f"[red]Error:[/] {exc}")


@app.command("init-db")
def cli_init_db() -> None:
    init_db()
    console.print("[green]Database ready[/]")


@customer_cli.command("add")
def add_customer(name: str, email: Optional[str] = None, phone: Optional[str] = None, notes: Optional[str] = None) -> None:
    with session_scope() as session:
        payload = CustomerCreate(name=name, email=email, phone=phone, notes=notes)
        try:
            customer = customers.create_customer(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
        console.print(f"[green]Created customer #[/]{customer.id}: {customer.name}")


@customer_cli.command("list")
def list_customers_cli() -> None:
    with session_scope() as session:
        rows = customers.list_customers(session)
    table = Table("ID", "Name", "Email", "Phone")
    for row in rows:
        table.add_row(str(row.id), row.name, row.email or "", row.phone or "")
    console.print(table)


@inventory_cli.command("list")
def list_inventory_cli() -> None:
    with session_scope() as session:
        items = inventory.list_items(session)
    table = Table("ID", "SKU", "Name", "Source", "Physical", "Allocated", "Available")
    for item in items:
        table.add_row(
            str(item.id),
            item.sku,
            item.name,
            item.source.value,
            str(item.physical_quantity),
            str(item.allocated_quantity),
            str(item.available_quantity),
        )
    console.print(table)


@inventory_cli.command("upsert")
def upsert_item_cli(
    sku: str,
    name: str,
    category: ProductCategory = typer.Option(ProductCategory.SINGLE),
    source: InventorySource = typer.Option(InventorySource.SUPPLIER),
    set_code: Optional[str] = None,
    printing: Optional[str] = None,
    condition: Optional[str] = None,
    game_title: Optional[str] = None,
    acquisition_reference: Optional[str] = None,
    unit_price_cents: int = 0,
    physical_quantity: int = 0,
) -> None:
    payload = InventoryCreate(
        sku=sku,
        name=name,
        category=category,
        source=source,
        set_code=set_code,
        printing=printing,
        condition=condition,
        game_title=game_title,
        acquisition_reference=acquisition_reference,
        unit_price_cents=unit_price_cents,
        physical_quantity=physical_quantity,
    )
    with session_scope() as session:
        try:
            item = inventory.upsert_item(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"[green]Upserted inventory[/] {item.sku} ({item.name})")


@inventory_cli.command("receive")
def receive_item_cli(item_id: int, quantity: int, note: Optional[str] = None) -> None:
    payload = ReceiveInventoryRequest(quantity=quantity, note=note, actor="cli")
    with session_scope() as session:
        try:
            item = inventory.receive_inventory(session, item_id, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"[green]Received[/] {quantity} units for {item.sku}. Physical now {item.physical_quantity}")


@inventory_cli.command("adjust")
def adjust_item_cli(
    item_id: int,
    delta: int,
    reason: AdjustmentReason = AdjustmentReason.CORRECTION,
    note: Optional[str] = None,
) -> None:
    payload = InventoryAdjustmentRequest(delta=delta, reason=reason, note=note, actor="cli")
    with session_scope() as session:
        try:
            item = inventory.adjust_stock(session, item_id, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Adjusted {item.sku}. Physical={item.physical_quantity} Allocated={item.allocated_quantity}")


@orders_cli.command("create")
def create_order_cli(customer_id: int, notes: Optional[str] = None) -> None:
    payload = OrderCreate(customer_id=customer_id, notes=notes)
    with session_scope() as session:
        try:
            order = orders.create_order(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"[green]Created order[/] #{order.id} for customer {customer_id}")


@orders_cli.command("add-item")
def add_item_cli(order_id: int, inventory_item_id: int, quantity: int, unit_price_cents: Optional[int] = None) -> None:
    payload = OrderItemCreate(
        inventory_item_id=inventory_item_id,
        quantity=quantity,
        unit_price_cents=unit_price_cents,
    )
    with session_scope() as session:
        try:
            item = orders.add_order_item(session, order_id, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Added {item.quantity}x SKU {item.inventory_item_id} to order {order_id}")


@orders_cli.command("submit")
def submit_order_cli(order_id: int) -> None:
    with session_scope() as session:
        try:
            order = orders.submit_order(session, order_id)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"[green]Order {order.id} submitted[/]")


@orders_cli.command("status")
def update_status_cli(order_id: int, status: OrderStatus) -> None:
    payload = OrderStatusUpdate(status=status)
    with session_scope() as session:
        try:
            order = orders.update_order_status(session, order_id, payload.status)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Order {order.id} now {order.status}")


@preorders_cli.command("create-item")
def create_preorder_item_cli(
    inventory_item_id: int,
    release_date: Optional[str] = None,
    quantity_cap: Optional[int] = None,
    notes: Optional[str] = None,
) -> None:
    parsed_date = date.fromisoformat(release_date) if release_date else None
    payload = PreorderItemCreate(
        inventory_item_id=inventory_item_id,
        release_date=parsed_date,
        quantity_cap=quantity_cap,
        notes=notes,
    )
    with session_scope() as session:
        try:
            preorder_item = preorders.create_preorder_item(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Created preorder item {preorder_item.id} for inventory {inventory_item_id}")


@preorders_cli.command("claim")
def create_preorder_claim_cli(preorder_item_id: int, customer_id: int, quantity: int) -> None:
    payload = PreorderClaimCreate(
        preorder_item_id=preorder_item_id,
        customer_id=customer_id,
        quantity_requested=quantity,
    )
    with session_scope() as session:
        try:
            claim = preorders.create_preorder_claim(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Created preorder claim {claim.id} for customer {customer_id}")


@preorders_cli.command("list-claims")
def list_claims_cli() -> None:
    with session_scope() as session:
        claims = preorders.list_preorder_claims(session)
    table = Table("ID", "Preorder", "Customer", "Qty", "Allocated", "Status")
    for claim in claims:
        table.add_row(
            str(claim.id),
            str(claim.preorder_item_id),
            str(claim.customer_id),
            str(claim.quantity_requested),
            str(claim.quantity_allocated),
            claim.status.value,
        )
    console.print(table)


@preorders_cli.command("fulfill")
def fulfill_claim_cli(claim_id: int, mark_picked_up: bool = True) -> None:
    payload = PreorderClaimFulfillRequest(mark_picked_up=mark_picked_up)
    with session_scope() as session:
        try:
            claim = preorders.fulfill_preorder_claim(session, claim_id, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"Preorder claim {claim.id} status {claim.status}")


@users_cli.command("list")
def list_users_cli() -> None:
    with session_scope() as session:
        rows = users_service.list_users(session)
        table = Table("ID", "Username", "Name", "Role", "Title", "Active")
        for row in rows:
            table.add_row(str(row.id), row.username, row.name, row.role.value, row.title or "", "yes" if row.is_active else "no")
        console.print(table)


@users_cli.command("add")
def add_user_cli(
    name: str = typer.Argument(..., help="Full name for the user."),
    username: str = typer.Argument(..., help="Unique username for login."),
    password: str = typer.Argument(..., help="Password (min 4 characters)."),
    role: str = typer.Option("employee", help="Role: owner, manager, or employee."),
    title: Optional[str] = typer.Option(None, help="Role or title."),
    email: Optional[str] = typer.Option(None, help="Optional email address."),
    active: bool = typer.Option(True, help="Whether the user is active."),
) -> None:
    from .models import UserRole
    try:
        user_role = UserRole(role.lower())
    except ValueError:
        console.print(f"[red]Invalid role '{role}'. Must be owner, manager, or employee.[/]")
        return
    payload = UserCreate(name=name, username=username, password=password, role=user_role, title=title, email=email, is_active=active)
    with session_scope() as session:
        try:
            user = users_service.create_user(session, payload)
        except CardPosError as exc:
            _handle_error(exc)
            return
    console.print(f"[green]Created user[/] #{user.id} {user.name} (@{user.username}) - {user.role.value}")


if __name__ == "__main__":
    app()
