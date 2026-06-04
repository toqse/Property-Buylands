"""Seed Kerala's state and its 14 districts into the database.

Idempotent: re-running will not create duplicates. Run with:

    python manage.py seed_kerala_districts
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from properties.models import District, State


STATE_NAME = "Kerala"

KERALA_DISTRICTS = [
    "Thiruvananthapuram",
    "Kollam",
    "Pathanamthitta",
    "Alappuzha",
    "Kottayam",
    "Idukki",
    "Ernakulam",
    "Thrissur",
    "Palakkad",
    "Malappuram",
    "Kozhikode",
    "Wayanad",
    "Kannur",
    "Kasaragod",
]


class Command(BaseCommand):
    help = (
        "Seed Kerala state with all 14 districts. "
        "Idempotent: existing rows are kept; only missing entries are added."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be inserted without writing to the database.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run: no changes will be written to the database.")
            )

        state, state_created = self._get_or_create(State, dry_run, name=STATE_NAME)
        if state_created:
            self.stdout.write(self.style.SUCCESS(f"+ State: {STATE_NAME}"))
        else:
            self.stdout.write(f"= State: {STATE_NAME} (already exists)")

        created = 0
        existing = 0

        for district_name in KERALA_DISTRICTS:
            _, d_created = self._get_or_create(
                District, dry_run, state=state, name=district_name
            )
            if d_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  + District: {district_name}"))
            else:
                existing += 1
                self.stdout.write(f"  = District: {district_name} (already exists)")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Summary"))
        self.stdout.write(
            f"  Districts created: {created}, already existing: {existing}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run complete; rolling back transaction.")
            )
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Kerala districts seeded successfully."))

    @staticmethod
    def _get_or_create(model, dry_run, **kwargs):
        """Wrapper around get_or_create that respects dry-run mode."""
        if dry_run:
            existing = model.objects.filter(**kwargs).first()
            if existing is not None:
                return existing, False
            instance = model(**kwargs)
            return instance, True
        return model.objects.get_or_create(**kwargs)
