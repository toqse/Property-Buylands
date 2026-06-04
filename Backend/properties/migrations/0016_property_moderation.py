import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def approve_existing(apps, schema_editor):
    Property = apps.get_model("properties", "Property")
    Property.objects.all().update(moderation_status="approved")


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("properties", "0015_alter_property_area_unit"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="moderation_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                ],
                db_index=True,
                default="pending",
                help_text="Public listings only show approved properties.",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(approve_existing, migrations.RunPython.noop),
        migrations.AddField(
            model_name="property",
            name="moderated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="property",
            name="moderated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="moderated_properties",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
