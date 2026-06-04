# Generated manually for testimonials feature

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0020_property_slug"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="testimonials_section_tag",
            field=models.CharField(
                default="CLIENT STORIES",
                help_text="Small label above the testimonials heading on the home page.",
                max_length=80,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="testimonials_section_heading",
            field=models.CharField(default="What our clients say", max_length=200),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="testimonials_section_description",
            field=models.TextField(
                default="Real experiences from people who found their perfect space with us.",
            ),
        ),
        migrations.CreateModel(
            name="Testimonial",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client_name", models.CharField(max_length=120)),
                (
                    "client_role",
                    models.CharField(help_text="e.g. Property Investor, Homeowner", max_length=120),
                ),
                ("testimonial_text", models.TextField()),
                (
                    "rating",
                    models.PositiveSmallIntegerField(
                        default=5,
                        validators=[
                            MinValueValidator(1),
                            MaxValueValidator(5),
                        ],
                    ),
                ),
                ("avatar", models.ImageField(blank=True, null=True, upload_to="testimonials/avatars/")),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("display_order", models.PositiveIntegerField(db_index=True, default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["display_order", "-created_at"],
            },
        ),
    ]
