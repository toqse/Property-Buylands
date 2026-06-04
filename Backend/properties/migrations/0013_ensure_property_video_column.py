from django.db import migrations


def forwards(apps, schema_editor):
    conn = schema_editor.connection
    if conn.vendor != "mysql":
        return
    with conn.cursor() as c:
        c.execute(
            """SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = 'property_video'""",
            ["properties_property"],
        )
        if c.fetchone()[0]:
            return
        c.execute(
            "ALTER TABLE `properties_property` ADD COLUMN `property_video` VARCHAR(100) NULL"
        )


class Migration(migrations.Migration):
    dependencies = [("properties", "0012_property_property_video")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
