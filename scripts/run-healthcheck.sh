#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# 🏥 HEALTH CHECK RUNNER
# ═══════════════════════════════════════════════════════════════════════════
# Run this script before builds to verify environment configuration
# Usage: ./scripts/run-healthcheck.sh

echo "Running pre-build health check..."
npx tsx scripts/healthcheck.ts
