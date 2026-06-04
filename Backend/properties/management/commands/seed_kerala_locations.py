"""Seed Kerala's state, districts, and main cities/towns into the database.

Idempotent: re-running will not create duplicates. Run with:

    python manage.py seed_kerala_locations
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from properties.models import City, District, State


STATE_NAME = "Kerala"


KERALA_LOCATIONS = {
    "Thiruvananthapuram": [
        "Thiruvananthapuram",
        "Neyyattinkara",
        "Attingal",
        "Varkala",
        "Nedumangad",
        "Kazhakuttam",
        "Kovalam",
        "Vizhinjam",
        "Kattakkada",
        "Vattiyoorkavu",
    ],
    "Kollam": [
        "Kollam",
        "Karunagappally",
        "Punalur",
        "Paravur",
        "Chavara",
        "Kottarakkara",
        "Anchal",
        "Kundara",
        "Chathannoor",
        "Sasthamcotta",
    ],
    "Pathanamthitta": [
        "Pathanamthitta",
        "Adoor",
        "Thiruvalla",
        "Pandalam",
        "Ranni",
        "Konni",
        "Mallappally",
        "Kozhencherry",
        "Aranmula",
        "Chengannur",
    ],
    "Alappuzha": [
        "Alappuzha",
        "Cherthala",
        "Kayamkulam",
        "Mavelikkara",
        "Haripad",
        "Chengannur",
        "Ambalappuzha",
        "Mannancherry",
        "Punnapra",
        "Karthikappally",
    ],
    "Kottayam": [
        "Kottayam",
        "Changanassery",
        "Pala",
        "Vaikom",
        "Ettumanoor",
        "Erattupetta",
        "Kanjirappally",
        "Mundakayam",
        "Kuravilangad",
        "Kumarakom",
    ],
    "Idukki": [
        "Painavu",
        "Thodupuzha",
        "Munnar",
        "Kattappana",
        "Kumily",
        "Adimali",
        "Devikulam",
        "Nedumkandam",
        "Peerumade",
        "Vandiperiyar",
    ],
    "Ernakulam": [
        "Kochi",
        "Ernakulam",
        "Aluva",
        "Perumbavoor",
        "Angamaly",
        "Muvattupuzha",
        "Kothamangalam",
        "Kalamassery",
        "Tripunithura",
        "North Paravur",
        "Kakkanad",
        "Edappally",
        "Vyttila",
        "Fort Kochi",
    ],
    "Thrissur": [
        "Thrissur",
        "Chalakudy",
        "Irinjalakuda",
        "Kodungallur",
        "Guruvayur",
        "Kunnamkulam",
        "Wadakkanchery",
        "Chavakkad",
        "Mala",
        "Ollur",
    ],
    "Palakkad": [
        "Palakkad",
        "Ottapalam",
        "Shoranur",
        "Chittur",
        "Mannarkkad",
        "Cherpulassery",
        "Pattambi",
        "Alathur",
        "Nemmara",
        "Kollengode",
    ],
    "Malappuram": [
        "Malappuram",
        "Manjeri",
        "Perinthalmanna",
        "Tirur",
        "Ponnani",
        "Nilambur",
        "Kondotty",
        "Tirurangadi",
        "Edappal",
        "Kottakkal",
        "Valanchery",
        "Areekode",
    ],
    "Kozhikode": [
        "Kozhikode",
        "Vatakara",
        "Koyilandy",
        "Feroke",
        "Ramanattukara",
        "Mukkam",
        "Balussery",
        "Thamarassery",
        "Beypore",
        "Kuttiady",
    ],
    "Wayanad": [
        "Kalpetta",
        "Mananthavady",
        "Sulthan Bathery",
        "Vythiri",
        "Pulpally",
        "Meppadi",
        "Panamaram",
        "Ambalavayal",
        "Padinjarathara",
        "Kaniyambetta",
    ],
    "Kannur": [
        "Kannur",
        "Thalassery",
        "Payyannur",
        "Mattannur",
        "Iritty",
        "Taliparamba",
        "Anthoor",
        "Sreekandapuram",
        "Koothuparamba",
        "Kuthuparamba",
        "Panoor",
    ],
    "Kasaragod": [
        "Kasaragod",
        "Kanhangad",
        "Nileshwar",
        "Uppala",
        "Manjeshwar",
        "Bekal",
        "Cheruvathur",
        "Parappa",
        "Vellarikundu",
        "Bedakam",
    ],
}


class Command(BaseCommand):
    help = (
        "Seed Kerala state with all 14 districts and their main cities/towns. "
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

        totals = {
            "districts_created": 0,
            "districts_existing": 0,
            "cities_created": 0,
            "cities_existing": 0,
        }

        for district_name, city_names in KERALA_LOCATIONS.items():
            district, d_created = self._get_or_create(
                District, dry_run, state=state, name=district_name
            )
            if d_created:
                totals["districts_created"] += 1
                self.stdout.write(self.style.SUCCESS(f"  + District: {district_name}"))
            else:
                totals["districts_existing"] += 1
                self.stdout.write(f"  = District: {district_name} (already exists)")

            for city_name in city_names:
                _, c_created = self._get_or_create(
                    City, dry_run, district=district, name=city_name
                )
                if c_created:
                    totals["cities_created"] += 1
                    self.stdout.write(self.style.SUCCESS(f"      + City: {city_name}"))
                else:
                    totals["cities_existing"] += 1
                    self.stdout.write(f"      = City: {city_name} (already exists)")

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Summary"))
        self.stdout.write(
            f"  Districts created: {totals['districts_created']}, "
            f"already existing: {totals['districts_existing']}"
        )
        self.stdout.write(
            f"  Cities created:    {totals['cities_created']}, "
            f"already existing: {totals['cities_existing']}"
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run complete; rolling back transaction.")
            )
            transaction.set_rollback(True)
        else:
            self.stdout.write(self.style.SUCCESS("Kerala locations seeded successfully."))

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
