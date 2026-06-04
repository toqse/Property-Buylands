from django.db import migrations, models

DEFAULT_PHONE = "9961280628"
DEFAULT_EMAIL = "Premiumproperty4you@gmail.com"
DEFAULT_ADDRESS = (
    "4/461, Second Floor, Valamkottil Towers, Thrikkakara, "
    "Ernakulam – 682021, Kerala, India"
)


def backfill_company_contact(apps, schema_editor):
    SiteSettings = apps.get_model("properties", "SiteSettings")
    obj, _ = SiteSettings.objects.get_or_create(pk=1)
    changed = False
    if not (obj.admin_phone or "").strip():
        obj.admin_phone = DEFAULT_PHONE
        changed = True
    if not (obj.admin_whatsapp or "").strip():
        obj.admin_whatsapp = DEFAULT_PHONE
        changed = True
    if not (obj.company_email or "").strip():
        obj.company_email = DEFAULT_EMAIL
        changed = True
    if not (obj.company_address or "").strip():
        obj.company_address = DEFAULT_ADDRESS
        changed = True
    if changed:
        obj.save()


class Migration(migrations.Migration):

    dependencies = [
        ("properties", "0021_testimonial_and_section_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="company_email",
            field=models.EmailField(
                default=DEFAULT_EMAIL,
                help_text="Company email shown in footer and contact page.",
                max_length=254,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="company_address",
            field=models.TextField(
                default=DEFAULT_ADDRESS,
                help_text="Company office address shown in footer and contact page.",
            ),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="admin_phone",
            field=models.CharField(
                blank=True,
                default=DEFAULT_PHONE,
                help_text="Company/platform contact phone shown on listings and public pages.",
                max_length=40,
            ),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="admin_whatsapp",
            field=models.CharField(
                blank=True,
                default=DEFAULT_PHONE,
                help_text="Platform WhatsApp (digits or E.164) shown on listings and contact page.",
                max_length=40,
            ),
        ),
        migrations.RunPython(backfill_company_contact, migrations.RunPython.noop),
    ]
