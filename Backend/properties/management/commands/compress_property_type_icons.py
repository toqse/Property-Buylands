"""Compress existing property-type (category) icon images.

New uploads are compressed automatically in PropertyType.save(). Use this
command to optimize icons that were stored before compression was enabled:

    python manage.py compress_property_type_icons
    python manage.py compress_property_type_icons --dry-run
    python manage.py compress_property_type_icons --force
    python manage.py compress_property_type_icons --id 3
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from properties.image_utils import (
    CATEGORY_ICON_MAX_BYTES,
    category_icon_is_optimized,
    compress_category_icon,
)
from properties.models import PropertyType


class Command(BaseCommand):
    help = (
        "Compress existing property-type category icons to WebP (max 80 KB, "
        "512 px longest edge). Skips icons that are already optimized unless "
        "--force is used."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing files.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recompress even when the icon is already WebP and under 80 KB.",
        )
        parser.add_argument(
            "--id",
            type=int,
            dest="type_id",
            metavar="ID",
            help="Compress only the property type with this primary key.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]
        type_id = options["type_id"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run: no files or database rows will be changed.")
            )

        qs = PropertyType.objects.exclude(image="").exclude(image__isnull=True)
        if type_id is not None:
            qs = qs.filter(pk=type_id)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No property types with icons found."))
            return

        compressed = 0
        skipped = 0
        failed = 0

        for ptype in qs.order_by("name"):
            if not ptype.image:
                skipped += 1
                continue

            if not force and category_icon_is_optimized(ptype.image):
                self.stdout.write(f"  skip  {ptype.name} (already optimized)")
                skipped += 1
                continue

            old_name = ptype.image.name
            try:
                old_size = ptype.image.size
            except Exception:
                old_size = None

            try:
                with ptype.image.open("rb") as source:
                    optimized = compress_category_icon(source)
            except Exception as exc:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f"  fail  {ptype.name} ({old_name}): {exc}")
                )
                continue

            new_size = len(optimized)
            if dry_run:
                compressed += 1
                size_note = f"{old_size or '?'} -> {new_size} bytes"
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  would compress  {ptype.name} ({old_name})  {size_note}"
                    )
                )
                continue

            try:
                with transaction.atomic():
                    ptype.image.save(optimized.name, optimized, save=True)
            except Exception as exc:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f"  fail  {ptype.name} ({old_name}): {exc}")
                )
                continue

            compressed += 1
            size_note = f"{old_size or '?'} -> {new_size} bytes"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  done  {ptype.name}  {old_name} -> {ptype.image.name}  ({size_note})"
                )
            )

        self.stdout.write("")
        self.stdout.write(
            f"Processed {total} icon(s): {compressed} compressed, {skipped} skipped, {failed} failed."
        )
        self.stdout.write(f"Target format: WebP, max {CATEGORY_ICON_MAX_BYTES // 1024} KB.")
