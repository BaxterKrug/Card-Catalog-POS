from fastapi import HTTPException, status

from .exceptions import CardPosError, NotFoundError, ValidationError


def raise_http_error(exc: CardPosError) -> None:
    if isinstance(exc, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_400_BAD_REQUEST
    else:
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    raise HTTPException(status_code=status_code, detail=str(exc))
