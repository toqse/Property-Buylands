from django.db import migrations, models


def migrate_built_year_to_string(apps, schema_editor):
    Property = apps.get_model("properties", "Property")
    for prop in Property.objects.all():
        old = prop.built_year
        prop.built_year_text = "" if old is None else str(old)
        prop.save(update_fields=["built_year_text"])


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0033_add_has_furnishing"),
    ]

    operations = [
        migrations.AlterField(
            model_name="property",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="property",
            name="built_year_text",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.RunPython(migrate_built_year_to_string, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="property",
            name="built_year",
        ),
        migrations.RenameField(
            model_name="property",
            old_name="built_year_text",
            new_name="built_year",
        ),
    ]
