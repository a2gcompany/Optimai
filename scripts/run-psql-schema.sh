#!/bin/bash

# Execute schema via psql
# Using Supavisor session mode connection

PGPASSWORD='tuDdex-3nekbi-tihsud' psql \
  "postgresql://postgres.vhnfdknvwvyaepokaqlx@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -f packages/db/schema-optimai.sql

echo "Done!"
