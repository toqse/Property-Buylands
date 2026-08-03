from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from accounts.models import StaffProfile


class Command(BaseCommand):
    help = (
        "Ensure a user is a platform superuser (full /admin access). "
        "Creates StaffProfile if missing. Usage: "
        "python manage.py promote_superuser email@example.com"
    )

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="User email to promote")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"No user with email {email}"))
            return

        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(update_fields=["is_staff", "is_superuser", "is_active"])
        StaffProfile.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(f"Promoted {email} to superuser."))
