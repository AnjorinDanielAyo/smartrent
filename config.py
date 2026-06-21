import os

class Config:
    SECRET_KEY = 'smartrent-secret-key-2025'
    DATABASE = os.path.join(os.path.dirname(__file__), 'smartrent.db')
    DEBUG = True
