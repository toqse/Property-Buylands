from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0027_property_video_thumbnail"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="ad_inject_after_every_n_properties",
            field=models.PositiveIntegerField(
                default=5,
                help_text="Global cadence: inject an ad after every N properties in the listing feed.",
            ),
        ),
    ]
