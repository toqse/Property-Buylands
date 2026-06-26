from django.db import migrations


def convert_ownership_values(apps, schema_editor):
    Property = apps.get_model("properties", "Property")
    mapping = {
        "management": "Management",
        "direct_owner": "Direct Owner",
        "owner": "Direct Owner",
    }
    for prop in Property.objects.all():
        raw = (prop.property_ownership or "").strip()
        key = raw.lower().replace(" ", "_")
        if key in mapping:
            prop.property_ownership = mapping[key]
            prop.save(update_fields=["property_ownership"])


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0031_property_type_flags_and_fields"),
    ]

    operations = [
        migrations.RunPython(convert_ownership_values, migrations.RunPython.noop),
    ]
