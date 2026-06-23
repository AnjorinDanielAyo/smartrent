import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartrent-secret-key-2025')
    DATABASE = os.environ.get('DATABASE', os.path.join(os.path.dirname(__file__), 'smartrent.db'))
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ['true', '1', 't']
