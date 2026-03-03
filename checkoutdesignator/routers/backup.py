"""
Database backup and export endpoints.
Provides CSV exports, SQL dumps, and Access-compatible formats.
"""
from datetime import datetime
from io import BytesIO, StringIO
import csv
import json
from typing import List, Literal
from zipfile import ZipFile

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from checkoutdesignator.auth import get_current_user
from checkoutdesignator.database import get_session
from checkoutdesignator.models import (
    BuylistTransaction,
    ChecklistCompletion,
    ChecklistTemplate,
    Customer,
    InventoryAdjustment,
    InventoryItem,
    Order,
    OrderItem,
    OrderPayment,
    PreorderClaim,
    PreorderItem,
    PreorderOrder,
    User,
)

router = APIRouter(prefix="/backup", tags=["backup"])


def require_owner(current_user: User = Depends(get_current_user)):
    """Require owner role for backup operations"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


@router.get("/export/csv/{table_name}")
def export_table_csv(
    table_name: Literal[
        "customers",
        "orders",
        "order_items",
        "order_payments",
        "inventory",
        "inventory_adjustments",
        "preorder_items",
        "preorder_orders",
        "preorder_claims",
        "buylist_transactions",
        "checklist_templates",
        "checklist_completions",
        "users",
    ],
    session: Session = Depends(get_session),
    current_user: User = Depends(require_owner),
):
    """Export a single table to CSV format"""
    
    # Map table names to models
    table_map = {
        "customers": Customer,
        "orders": Order,
        "order_items": OrderItem,
        "order_payments": OrderPayment,
        "inventory": InventoryItem,
        "inventory_adjustments": InventoryAdjustment,
        "preorder_items": PreorderItem,
        "preorder_orders": PreorderOrder,
        "preorder_claims": PreorderClaim,
        "buylist_transactions": BuylistTransaction,
        "checklist_templates": ChecklistTemplate,
        "checklist_completions": ChecklistCompletion,
        "users": User,
    }
    
    model = table_map[table_name]
    statement = select(model)
    records = session.exec(statement).all()
    
    if not records:
        raise HTTPException(status_code=404, detail=f"No data found in {table_name}")
    
    # Create CSV
    output = StringIO()
    
    # Get column names from first record
    first_record = records[0]
    fieldnames = list(first_record.model_dump().keys())
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for record in records:
        row_dict = record.model_dump()
        # Convert datetime objects to ISO format strings
        for key, value in row_dict.items():
            if isinstance(value, datetime):
                row_dict[key] = value.isoformat()
            elif value is None:
                row_dict[key] = ""
        writer.writerow(row_dict)
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={table_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


@router.get("/export/all-csv")
def export_all_tables_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_owner),
):
    """Export all tables as a ZIP file containing CSV files"""
    
    tables = [
        ("customers", Customer),
        ("orders", Order),
        ("order_items", OrderItem),
        ("order_payments", OrderPayment),
        ("inventory", InventoryItem),
        ("inventory_adjustments", InventoryAdjustment),
        ("preorder_items", PreorderItem),
        ("preorder_orders", PreorderOrder),
        ("preorder_claims", PreorderClaim),
        ("buylist_transactions", BuylistTransaction),
        ("checklist_templates", ChecklistTemplate),
        ("checklist_completions", ChecklistCompletion),
        ("users", User),
    ]
    
    # Create ZIP file in memory
    zip_buffer = BytesIO()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    with ZipFile(zip_buffer, "w") as zip_file:
        for table_name, model in tables:
            statement = select(model)
            records = session.exec(statement).all()
            
            if not records:
                continue
            
            # Create CSV for this table
            output = StringIO()
            first_record = records[0]
            fieldnames = list(first_record.model_dump().keys())
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for record in records:
                row_dict = record.model_dump()
                for key, value in row_dict.items():
                    if isinstance(value, datetime):
                        row_dict[key] = value.isoformat()
                    elif value is None:
                        row_dict[key] = ""
                writer.writerow(row_dict)
            
            # Add to ZIP
            zip_file.writestr(f"{table_name}.csv", output.getvalue())
    
    zip_buffer.seek(0)
    
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=cardcatalog_backup_{timestamp}.zip"
        },
    )


@router.get("/export/json")
def export_all_json(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_owner),
):
    """Export entire database as JSON (useful for importing into other systems)"""
    
    tables = [
        ("customers", Customer),
        ("orders", Order),
        ("order_items", OrderItem),
        ("order_payments", OrderPayment),
        ("inventory", InventoryItem),
        ("inventory_adjustments", InventoryAdjustment),
        ("preorder_items", PreorderItem),
        ("preorder_orders", PreorderOrder),
        ("preorder_claims", PreorderClaim),
        ("buylist_transactions", BuylistTransaction),
        ("checklist_templates", ChecklistTemplate),
        ("checklist_completions", ChecklistCompletion),
        ("users", User),
    ]
    
    export_data = {
        "export_timestamp": datetime.now().isoformat(),
        "tables": {}
    }
    
    for table_name, model in tables:
        statement = select(model)
        records = session.exec(statement).all()
        
        export_data["tables"][table_name] = [
            record.model_dump(mode="json") for record in records
        ]
    
    json_content = json.dumps(export_data, indent=2, default=str)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=cardcatalog_backup_{timestamp}.json"
        },
    )


@router.get("/export/sql")
def export_sql_dump(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_owner),
):
    """
    Generate SQL INSERT statements for all data.
    This can be used to restore data or import into Access/other databases.
    """
    
    tables = [
        ("customer", Customer),
        ("inventoryitem", InventoryItem),
        ("order", Order),
        ("orderitem", OrderItem),
        ("orderpayment", OrderPayment),
        ("preorderitem", PreorderItem),
        ("preorderorder", PreorderOrder),
        ("preorderclaim", PreorderClaim),
        ("inventoryadjustment", InventoryAdjustment),
        ("buylisttransaction", BuylistTransaction),
        ("checklisttemplate", ChecklistTemplate),
        ("checklistcompletion", ChecklistCompletion),
        ("user", User),
    ]
    
    sql_output = StringIO()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    sql_output.write(f"-- Card Catalog POS Database Backup\n")
    sql_output.write(f"-- Generated: {timestamp}\n")
    sql_output.write(f"-- PostgreSQL compatible SQL\n\n")
    
    for table_name, model in tables:
        statement = select(model)
        records = session.exec(statement).all()
        
        if not records:
            continue
        
        sql_output.write(f"\n-- Table: {table_name}\n")
        
        for record in records:
            row_dict = record.model_dump()
            columns = list(row_dict.keys())
            values = []
            
            for key in columns:
                value = row_dict[key]
                if value is None:
                    values.append("NULL")
                elif isinstance(value, (int, float)):
                    values.append(str(value))
                elif isinstance(value, bool):
                    values.append("TRUE" if value else "FALSE")
                elif isinstance(value, datetime):
                    values.append(f"'{value.isoformat()}'")
                else:
                    # Escape single quotes in strings
                    escaped = str(value).replace("'", "''")
                    values.append(f"'{escaped}'")
            
            columns_str = ", ".join(columns)
            values_str = ", ".join(values)
            
            sql_output.write(
                f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});\n"
            )
    
    sql_content = sql_output.getvalue()
    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    return Response(
        content=sql_content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f"attachment; filename=cardcatalog_backup_{timestamp_file}.sql"
        },
    )


@router.get("/info")
def get_backup_info(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_owner),
):
    """Get information about database size and record counts"""
    
    tables = [
        ("customers", Customer),
        ("orders", Order),
        ("order_items", OrderItem),
        ("order_payments", OrderPayment),
        ("inventory", InventoryItem),
        ("inventory_adjustments", InventoryAdjustment),
        ("preorder_items", PreorderItem),
        ("preorder_orders", PreorderOrder),
        ("preorder_claims", PreorderClaim),
        ("buylist_transactions", BuylistTransaction),
        ("checklist_templates", ChecklistTemplate),
        ("checklist_completions", ChecklistCompletion),
        ("users", User),
    ]
    
    info = {
        "timestamp": datetime.now().isoformat(),
        "tables": {}
    }
    
    total_records = 0
    for table_name, model in tables:
        count = session.exec(select(model)).all()
        record_count = len(count)
        info["tables"][table_name] = {
            "record_count": record_count,
            "columns": list(count[0].model_dump().keys()) if count else []
        }
        total_records += record_count
    
    info["total_records"] = total_records
    
    return info
