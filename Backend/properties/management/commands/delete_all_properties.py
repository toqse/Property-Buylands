from django.core.management.base import BaseCommand

from properties.models import Property


class Command(BaseCommand):
    help = (
        "Delete every Property row. Related PropertyImage rows are removed via CASCADE. "
        "States, districts, cities, and property types are not deleted."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Confirm that you want to delete all properties.",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            self.stderr.write(
                self.style.ERROR(
                    "Refusing to delete: re-run with --yes to delete all properties."
                )
            )
            return

        total = Property.objects.count()
        Property.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {total} propert(y/ies)."))
