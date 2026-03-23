# Pre-built mode datasets

Each subdirectory (`baseline`, `high_volume`, …) is produced by:

```bash
npm run build:dataset -- baseline 180
```

Or build all six:

```bash
npm run build:all-datasets
```

Commit the generated `*.json.gz` files and `metadata.json` (optional for large repos — use Git LFS for `*.json.gz` if needed).

Before **switching modes** in admin or `POST /api/sim/switch-mode`, ensure Kanta has:

- `equipment`, `refrigerator_units`, `qc_materials` for the facility
- Migrations applied so `mazra_generated` exists on all written tables

The loader runs `seedQualitativeQcConfigs` before inserting rows so `qualitative_qc_entries` resolve `config_id`.
