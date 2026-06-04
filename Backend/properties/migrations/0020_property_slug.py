# Generated manually for slug backfill

from django.db import migrations, models
from django.utils.text import slugify


def backfill_property_slugs(apps, schema_editor):
    Property = apps.get_model("properties", "Property")
    used = set()
    for p in Property.objects.all().order_by("id"):
        base = slugify(p.title)[:180] or f"property-{p.pk}"
        candidate = base
        n = 0
        while candidate in used or Property.objects.filter(slug=candidate).exclude(pk=p.pk).exists():
            n += 1
            suffix = f"-{n}"
            candidate = (base[: 220 - len(suffix)] + suffix)[:220]
        while str(candidate).isdigit():
            candidate = f"{candidate}-x"[:220]
        used.add(candidate)
        p.slug = candidate
        p.save(update_fields=["slug"])


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0019_owner_buyer_enquiry"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="slug",
            field=models.SlugField(blank=True, db_index=True, max_length=220, null=True),
        ),
        migrations.RunPython(backfill_property_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="property",
            name="slug",
            field=models.SlugField(
                db_index=True,
                help_text="URL segment for public detail pages; auto-generated from title if omitted.",
                max_length=220,
                unique=True,
            ),
        ),
    ]
