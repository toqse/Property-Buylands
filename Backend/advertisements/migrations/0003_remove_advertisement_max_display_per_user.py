from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('advertisements', '0002_alter_advertisement_city_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='advertisement',
            name='max_display_per_user',
        ),
    ]
