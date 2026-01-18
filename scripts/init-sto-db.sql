-- Create sto_db database if it doesn't exist
SELECT 'CREATE DATABASE sto_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sto_db')\gexec
