"""
Django settings for property_listing project.
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# --------------------------------------------------
# BASE DIR
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------------------
# LOAD ENV
# --------------------------------------------------
load_dotenv(BASE_DIR / ".env")

# --------------------------------------------------
# SECURITY
# --------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-dev-key")

DEBUG = True

ALLOWED_HOSTS = [
    '13.201.233.41',
    'api.buylandsindia.com',
    'buylandsindia.com',
    'www.buylandsindia.com',
]

# --------------------------------------------------
# CORS
# --------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://buylandsindia.com",
    "https://www.buylandsindia.com",
    "https://api.buylandsindia.com",
]

# Local development
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# --------------------------------------------------
# APPLICATIONS
# --------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    'storages',  # ADD THIS

    # Local Apps
    'property_listing',
    'accounts',
    'properties',
    'advertisements',
]

# --------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --------------------------------------------------
# ROOT URL
# --------------------------------------------------
ROOT_URLCONF = 'property_listing.urls'

# --------------------------------------------------
# TEMPLATES
# --------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# --------------------------------------------------
# WSGI
# --------------------------------------------------
WSGI_APPLICATION = 'property_listing.wsgi.application'

# --------------------------------------------------
# DATABASE
# Driver is selected via DB_ENGINE in .env:
#   DB_ENGINE=mysql   -> django.db.backends.mysql   (default)
#   DB_ENGINE=sqlite  -> django.db.backends.sqlite3
#
# MySQL env vars (used when DB_ENGINE=mysql):
#   DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
#
# SQLite env vars (used when DB_ENGINE=sqlite):
#   SQLITE_DB_PATH (optional, defaults to BASE_DIR/data/db.sqlite3)
# --------------------------------------------------
DB_ENGINE = os.getenv("DB_ENGINE", "mysql").lower()

if DB_ENGINE == "sqlite":
    _sqlite_db = os.getenv("SQLITE_DB_PATH")
    _db_path = Path(_sqlite_db) if _sqlite_db else BASE_DIR / "data" / "db.sqlite3"
    _db_path.parent.mkdir(parents=True, exist_ok=True)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": str(_db_path),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("DB_NAME", ""),
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        }
    }

# --------------------------------------------------
# PASSWORD VALIDATION
# --------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# --------------------------------------------------
# INTERNATIONALIZATION
# --------------------------------------------------
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# --------------------------------------------------
# STATIC FILES
# Project assets live in `static/`; `collectstatic` writes to `staticfiles/` for WhiteNoise.
# --------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# --------------------------------------------------
# MEDIA FILES
# --------------------------------------------------
# --------------------------------------------------
# MEDIA FILES (Amazon S3)
# --------------------------------------------------

AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN")

AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

MEDIA_URL = (
    f"https://{AWS_STORAGE_BUCKET_NAME}.s3."
    f"{AWS_S3_REGION_NAME}.amazonaws.com/"
)

# --------------------------------------------------
# STORAGES (WhiteNoise serves collected static in production)
# CompressedStaticFilesStorage: gzip/brotli-friendly, no manifest file requirement.
# --------------------------------------------------
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# --------------------------------------------------
# FILE UPLOAD LIMIT
# --------------------------------------------------
_PROPERTY_VIDEO_MAX_BYTES = 100 * 1024 * 1024
_MULTIPART_OVERHEAD = 5 * 1024 * 1024

DATA_UPLOAD_MAX_REQUEST_SIZE = (
    _PROPERTY_VIDEO_MAX_BYTES + _MULTIPART_OVERHEAD
)

# --------------------------------------------------
# DEFAULT PRIMARY KEY
# --------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --------------------------------------------------
# REST FRAMEWORK
# --------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# --------------------------------------------------
# EMAIL (Gmail SMTP via .env)
# --------------------------------------------------
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "Buylands India <noreply@buylandsindia.com>",
)

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

OTP_ADMIN_NOTIFY_EMAIL = os.getenv("OTP_ADMIN_NOTIFY_EMAIL", "")
OTP_NOTIFY_ON_FAILURE = os.getenv("OTP_NOTIFY_ON_FAILURE", "True").lower() in ("true", "1", "yes")

# Optional override when the app process PATH omits /usr/bin (common under systemd/gunicorn).
FFMPEG_BINARY = os.getenv("FFMPEG_BINARY", "/usr/bin/ffmpeg").strip() or None

# --------------------------------------------------
# DEVELOPMENT LOGGING
# --------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}