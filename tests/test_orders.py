from checkoutdesignator.models import OrderStatus, ProductCategory
from checkoutdesignator.schemas import CustomerCreate, InventoryCreate, OrderCreate, OrderItemCreate
from checkoutdesignator.services import customers, inventory, orders


def test_order_pickup_updates_inventory_layers(session):
    customer = customers.create_customer(session, CustomerCreate(name="Pickup Pro"))
    item = inventory.upsert_item(
        session,
        InventoryCreate(
            sku="SKU-123",
            name="Staple Rare",
            category=ProductCategory.SINGLE,
            physical_quantity=5,
        ),
    )
    assert customer.id is not None
    assert item.id is not None

    order = orders.create_order(session, OrderCreate(customer_id=customer.id))
    assert order.id is not None

    orders.add_order_item(
        session,
        order.id,
        OrderItemCreate(inventory_item_id=item.id, quantity=3, unit_price_cents=1500),
    )

    open_order = orders.submit_order(session, order.id)
    assert open_order.status == OrderStatus.OPEN

    refreshed_item = inventory.get_item_or_raise(session, item.id)
    assert refreshed_item.allocated_quantity == 3
    assert refreshed_item.physical_quantity == 5

    closed_order = orders.update_order_status(session, order.id, OrderStatus.PICKED_UP)
    assert closed_order.status == OrderStatus.PICKED_UP

    final_item = inventory.get_item_or_raise(session, item.id)
    assert final_item.physical_quantity == 2
    assert final_item.allocated_quantity == 0
