import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DATABASE = os.environ.get('DATABASE', os.path.join(os.path.dirname(__file__), 'smartrent.db'))
    DEBUG = True
