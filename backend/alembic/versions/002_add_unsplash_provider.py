"""Add unsplash to provider enum

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE user_provider_credentials "
        "MODIFY COLUMN provider ENUM('openai', 'leonardo', 'unsplash') NOT NULL"
    )


def downgrade() -> None:
    # Remove unsplash rows before reverting enum
    op.execute(
        "DELETE FROM user_provider_credentials WHERE provider = 'unsplash'"
    )
    op.execute(
        "ALTER TABLE user_provider_credentials "
        "MODIFY COLUMN provider ENUM('openai', 'leonardo') NOT NULL"
    )
