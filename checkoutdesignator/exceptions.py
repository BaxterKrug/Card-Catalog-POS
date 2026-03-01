class CardPosError(Exception):
    """Base business-rule exception for CheckoutDesignator."""


class NotFoundError(CardPosError):
    """Raised when a requested entity does not exist."""


class ValidationError(CardPosError):
    """Raised when domain rules are violated (e.g., oversell attempts)."""
