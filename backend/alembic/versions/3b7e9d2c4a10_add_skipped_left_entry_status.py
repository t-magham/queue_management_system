"""add SKIPPED and LEFT to entrystatus enum

The model's EntryStatus gained SKIPPED and LEFT, but no migration added them
to the Postgres enum, so skip/leave/remove failed with "invalid input value".

Revision ID: 3b7e9d2c4a10
Revises: 12ac05916086
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3b7e9d2c4a10'
down_revision: Union[str, Sequence[str], None] = '12ac05916086'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ... ADD VALUE can't be used in the same transaction that adds it,
    # so run it outside alembic's migration transaction.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE entrystatus ADD VALUE IF NOT EXISTS 'SKIPPED'")
        op.execute("ALTER TYPE entrystatus ADD VALUE IF NOT EXISTS 'LEFT'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres can't drop enum values; leaving them in place is harmless.
    pass
