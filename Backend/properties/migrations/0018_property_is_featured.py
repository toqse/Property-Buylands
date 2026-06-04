from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0017_alter_property_moderation_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="is_featured",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Highlight on marketing site when integrated with public listings.",
            ),
        ),
    ]
