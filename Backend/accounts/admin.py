from django.contrib import admin
from .models import OTPVerification, StaffActivityLog, StaffProfile

admin.site.register(OTPVerification)
admin.site.register(StaffProfile)
admin.site.register(StaffActivityLog)
