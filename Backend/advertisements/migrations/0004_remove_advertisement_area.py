from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('advertisements', '0003_remove_advertisement_max_display_per_user'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='advertisement',
            name='area',
        ),
    ]
