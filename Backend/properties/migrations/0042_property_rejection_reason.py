from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0041_require_staff_property_approval"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="rejection_reason",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Free-text reason shown to the owner/staff when a listing is rejected.",
            ),
        ),
    ]
