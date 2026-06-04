# Generated manually

import django.core.validators
from django.db import migrations, models

from properties.validators import validate_property_video_file_size


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0011_all_property_changes"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="property_video",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="property/videos/",
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=["mp4", "mov", "avi", "mkv", "webm"]
                    ),
                    validate_property_video_file_size,
                ],
            ),
        ),
    ]
