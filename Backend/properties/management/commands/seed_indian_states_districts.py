"""Seed all Indian states/UTs and their districts into the database.

Idempotent: re-running will not create duplicates. Kerala is skipped by default
(already seeded via seed_kerala_districts). Run with:

    python manage.py seed_indian_states_districts
    python manage.py seed_indian_states_districts --state "Tamil Nadu"
    python manage.py seed_indian_states_districts --include-kerala
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from properties.data.indian_states_districts import INDIAN_STATES_AND_DISTRICTS
from properties.models import District, State

DEFAULT_SKIP_STATES = {"Kerala"}


class Command(BaseCommand):
    help = (
        "Seed Indian states and union territories with their districts. "
        "Idempotent: existing rows are kept; only missing entries are added."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be inserted without writing to the database.",
        )
        parser.add_argument(
            "--state",
            action="append",
            dest="states",
            metavar="NAME",
            help="Seed only the given state/UT (repeatable). Case-insensitive match.",
        )
        parser.add_argument(
            "--include-kerala",
            action="store_true",
            help="Also seed Kerala (skipped by default; use seed_kerala_districts for cities).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        include_kerala = options["include_kerala"]
        state_filter = options["states"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run: no changes will be written to the database.")
            )

        skip_states = set() if include_kerala else DEFAULT_SKIP_STATES
        states_data = self._resolve_states(state_filter, skip_states)

        if not states_data:
            self.stdout.write(self.style.WARNING("No states to seed."))
            return

        totals = {
            "states_created": 0,
            "districts_created": 0,
            "districts_existing": 0,
        }

        for state_name, districts in sorted(states_data.items()):
            state, state_created = self._get_or_create(State, dry_run, name=state_name)
            if state_created:
                totals["states_created"] += 1
                self.stdout.write(self.style.SUCCESS(f"+ State: {state_name}"))
            else:
                self.stdout.write(f"= State: {state_name} (already exists)")

            for district_name in districts:
                _, d_created = self._get_or_create_district(
                    dry_run, state=state, state_name=state_name, name=district_name
                )
                if d_created:
                    totals["districts_created"] += 1
                    self.stdout.write(self.style.SUCCESS(f"  + District: {district_name}"))
                else:
                    totals["districts_existing"] += 1
                    self.stdout.write(f"  = District: {district_name} (already exists)")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Summary"))
        self.stdout.write(f"  States created: {totals['states_created']}")
        self.stdout.write(
            f"  Districts created: {totals['districts_created']}, "
            f"already existing: {totals['districts_existing']}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run complete; rolling back transaction.")
            )
            transaction.set_rollback(True)
        else:
            self.stdout.write(
                self.style.SUCCESS("Indian states and districts seeded successfully.")
            )

    def _resolve_states(self, state_filter, skip_states):
        available = {
            name: districts
            for name, districts in INDIAN_STATES_AND_DISTRICTS.items()
            if name not in skip_states
        }

        if not state_filter:
            return available

        lookup = {name.lower(): name for name in INDIAN_STATES_AND_DISTRICTS}
        selected = {}

        for raw_name in state_filter:
            key = raw_name.strip().lower()
            canonical = lookup.get(key)
            if canonical is None:
                self.stderr.write(
                    self.style.ERROR(f"Unknown state/UT: {raw_name!r}")
                )
                continue
            if canonical in skip_states:
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping {canonical} (use --include-kerala to seed it)."
                    )
                )
                continue
            selected[canonical] = INDIAN_STATES_AND_DISTRICTS[canonical]

        return selected

    @staticmethod
    def _get_or_create_district(dry_run, *, state, state_name, name):
        if dry_run:
            if state.pk is None:
                existing = District.objects.filter(state__name=state_name, name=name).first()
            else:
                existing = District.objects.filter(state=state, name=name).first()
            if existing is not None:
                return existing, False
            return District(state=state, name=name), True
        return District.objects.get_or_create(state=state, name=name)

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
