import os
import sys
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Client, Milestone, NetworkDevice, Project, ProjectAction, ProjectDecision, RaidItem, Site, Tenant, User, WanCircuit


def main() -> None:
    admin_email = os.environ.get("INITIAL_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("INITIAL_ADMIN_PASSWORD", "")
    admin_name = os.environ.get("INITIAL_ADMIN_NAME", "Department Administrator").strip()
    tenant_name = os.environ.get("INITIAL_TENANT_NAME", "Internal Department").strip()

    if not admin_email or not admin_password:
        raise SystemExit("Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before running this script.")
    if len(admin_password) < 8:
        raise SystemExit("INITIAL_ADMIN_PASSWORD must contain at least 8 characters.")

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        tenant = db.scalar(select(Tenant).where(Tenant.name == tenant_name))
        if tenant is None:
            tenant = Tenant(name=tenant_name)
            db.add(tenant)
            db.flush()

        user = db.scalar(select(User).where(User.email == admin_email))
        if user is None:
            db.add(User(
                tenant_id=tenant.id,
                email=admin_email,
                full_name=admin_name,
                password_hash=hash_password(admin_password),
                role="platform_admin",
            ))
        db.commit()

    print(f"Database initialized for tenant: {tenant_name}")
    print(f"Administrator ready: {admin_email}")


if __name__ == "__main__":
    main()