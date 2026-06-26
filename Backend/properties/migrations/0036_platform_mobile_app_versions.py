from django.db import migrations, models


def copy_mobile_app_settings(apps, schema_editor):
    SiteSettings = apps.get_model("properties", "SiteSettings")
    for row in SiteSettings.objects.all():
        row.android_app_version = row.mobile_app_version or "1.0.0"
        row.ios_app_version = row.mobile_app_version or "1.0.0"
        row.android_force_update = bool(row.mobile_force_update)
        row.ios_force_update = bool(row.mobile_force_update)
        row.save(
            update_fields=[
                "android_app_version",
                "ios_app_version",
                "android_force_update",
                "ios_force_update",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0035_property_area_decimal"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="android_app_version",
            field=models.CharField(
                default="1.0.0",
                help_text="Current published Android app version, e.g. 1.4.3",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="android_force_update",
            field=models.BooleanField(
                default=False,
                help_text="If true, the Android app forces users to update.",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="ios_app_version",
            field=models.CharField(
                default="1.0.0",
                help_text="Current published iOS app version, e.g. 1.4.3",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="ios_force_update",
            field=models.BooleanField(
                default=False,
                help_text="If true, the iOS app forces users to update.",
            ),
        ),
        migrations.RunPython(copy_mobile_app_settings, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="sitesettings",
            name="mobile_app_version",
        ),
        migrations.RemoveField(
            model_name="sitesettings",
            name="mobile_force_update",
        ),
    ]
