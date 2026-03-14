#!/usr/bin/env python3
"""
Fix existing preorder claims that have quantity_allocated = 0.
This was a bug where claims were created without auto-allocating.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import PreorderClaim, PreorderClaimStatus

def fix_allocations():
    with Session(engine) as session:
        # Find all claims where quantity_allocated is less than quantity_requested
        # and the claim is not cancelled or fulfilled
        statement = select(PreorderClaim).where(
            PreorderClaim.quantity_allocated < PreorderClaim.quantity_requested,
            PreorderClaim.status.in_([PreorderClaimStatus.WAITING, PreorderClaimStatus.ALLOCATED])
        )
        claims = session.exec(statement).all()
        
        if not claims:
            print("No claims need fixing.")
            return
        
        print(f"Found {len(claims)} claims to fix:")
        for claim in claims:
            print(f"  - Claim #{claim.id}: allocated={claim.quantity_allocated}, requested={claim.quantity_requested}")
            claim.quantity_allocated = claim.quantity_requested
            session.add(claim)
        
        session.commit()
        print(f"\nFixed {len(claims)} claims.")

if __name__ == "__main__":
    fix_allocations()
