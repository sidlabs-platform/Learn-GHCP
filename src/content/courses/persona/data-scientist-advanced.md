---
title: "MLOps Pipelines with Agentic Copilot"
description: "Design production MLOps infrastructure with automated model retraining, monitoring, and deployment using Copilot agents."
track: "persona"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - copilot-cli
  - mcp-integration
personaTags:
  - data-scientist
  - architect
technologyTags:
  - python
  - mlflow
  - kubernetes
  - github-actions
prerequisites:
  - data-scientist-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 MLOps Pipelines with Agentic Copilot

In this advanced course you'll design and build production MLOps infrastructure — automated retraining pipelines, model monitoring agents, A/B testing, and an MCP server that connects Copilot to your ML experiment data.

## Prerequisites

- Completed [ML Workflows with Copilot](/Learn-GHCP/courses/persona/data-scientist-intermediate/)
- Experience with MLflow, Docker, and GitHub Actions
- Understanding of model serving concepts
- Familiarity with MCP protocol basics

### Install dependencies

```bash
pip install mlflow scikit-learn pandas numpy fastapi uvicorn pydantic httpx evidently optuna
```

## Step 1: Full MLOps Pipeline Architecture

A production MLOps system has these core components:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Data Store  │────▶│  Training    │────▶│  Registry    │
│  S3 / GCS   │     │  Pipeline    │     │  MLflow      │
│  Feature DB  │     │  GitHub Act. │     │  Model Store │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
┌──────────────┐     ┌──────────────┐             │
│  Monitoring  │◀────│  Serving     │◀────────────┘
│  Drift Det.  │     │  FastAPI     │
│  Perf Alerts │     │  A/B Testing │
│  Copilot MCP │     │  K8s Deploy  │
└──────┬───────┘     └──────────────┘
       │
       │ drift detected
       ▼
┌──────────────┐
│  Retrain     │
│  Trigger     │
│  Auto / Human│
└──────────────┘
```

## Step 2: Automated Retraining Pipeline

### GitHub Actions training workflow

Create `.github/workflows/train-model.yml`:

```yaml
name: Model Training Pipeline

on:
  schedule:
    - cron: "0 2 * * 1"  # Weekly Monday at 2 AM UTC
  workflow_dispatch:
    inputs:
      reason:
        description: "Reason for retraining"
        required: true
        type: string
      force_deploy:
        description: "Skip A/B test and deploy immediately"
        type: boolean
        default: false

permissions:
  contents: read
  packages: write
  issues: write

env:
  MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}
  EXPERIMENT_NAME: "production-model"

jobs:
  validate-data:
    runs-on: ubuntu-latest
    outputs:
      data_hash: ${{ steps.validate.outputs.hash }}
      row_count: ${{ steps.validate.outputs.rows }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install -r requirements.txt

      - name: Validate training data
        id: validate
        run: |
          python -c "
          import pandas as pd
          import hashlib
          import json

          df = pd.read_parquet('data/training_data.parquet')

          # Data quality checks
          assert df.shape[0] > 1000, f'Insufficient rows: {df.shape[0]}'
          assert df.isnull().sum().sum() / df.size < 0.1, 'Too many missing values (>10%)'

          # Check for data drift against baseline
          stats = df.describe().to_json()
          data_hash = hashlib.sha256(stats.encode()).hexdigest()[:12]

          print(f'rows={df.shape[0]}')
          print(f'hash={data_hash}')

          with open('data_validation.json', 'w') as f:
              json.dump({
                  'rows': df.shape[0],
                  'columns': df.shape[1],
                  'hash': data_hash,
                  'null_rate': float(df.isnull().sum().sum() / df.size),
              }, f)
          "

          echo "hash=$(python -c 'import json; print(json.load(open(\"data_validation.json\"))[\"hash\"])')" >> $GITHUB_OUTPUT
          echo "rows=$(python -c 'import json; print(json.load(open(\"data_validation.json\"))[\"rows\"])')" >> $GITHUB_OUTPUT

  train:
    needs: validate-data
    runs-on: ubuntu-latest
    outputs:
      model_version: ${{ steps.train.outputs.version }}
      test_f1: ${{ steps.train.outputs.f1 }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install -r requirements.txt

      - name: Train model
        id: train
        run: |
          python scripts/train_production.py \
            --experiment "$EXPERIMENT_NAME" \
            --data-hash "${{ needs.validate-data.outputs.data_hash }}" \
            --output-version-file model_version.txt

          echo "version=$(cat model_version.txt)" >> $GITHUB_OUTPUT
          echo "f1=$(python -c 'import json; print(json.load(open(\"metrics.json\"))[\"test_f1\"])')" >> $GITHUB_OUTPUT

      - name: Upload model artifacts
        uses: actions/upload-artifact@v4
        with:
          name: model-${{ steps.train.outputs.version }}
          path: |
            model_version.txt
            metrics.json
            evaluation/

  evaluate-against-champion:
    needs: train
    runs-on: ubuntu-latest
    outputs:
      should_deploy: ${{ steps.compare.outputs.should_deploy }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - run: pip install -r requirements.txt

      - name: Compare with champion model
        id: compare
        run: |
          python -c "
          import mlflow
          import json

          client = mlflow.tracking.MlflowClient()

          # Get champion model metrics
          champion = client.get_model_version_by_alias('production-model', 'champion')
          champion_run = client.get_run(champion.run_id)
          champion_f1 = float(champion_run.data.metrics.get('test_f1', 0))

          # Get challenger metrics
          challenger_f1 = float('${{ needs.train.outputs.test_f1 }}')

          improvement = (challenger_f1 - champion_f1) / champion_f1 * 100
          should_deploy = improvement > 1.0  # Deploy if >1% improvement

          print(f'Champion F1:   {champion_f1:.4f}')
          print(f'Challenger F1: {challenger_f1:.4f}')
          print(f'Improvement:   {improvement:.2f}%')
          print(f'Deploy:        {should_deploy}')

          with open('comparison.json', 'w') as f:
              json.dump({
                  'champion_f1': champion_f1,
                  'challenger_f1': challenger_f1,
                  'improvement_pct': improvement,
                  'should_deploy': should_deploy,
              }, f)
          "

          echo "should_deploy=$(python -c 'import json; print(str(json.load(open(\"comparison.json\"))[\"should_deploy\"]).lower())')" >> $GITHUB_OUTPUT

  deploy:
    needs: [train, evaluate-against-champion]
    if: needs.evaluate-against-champion.outputs.should_deploy == 'true' || github.event.inputs.force_deploy == 'true'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Promote to champion
        run: |
          echo "Promoting model ${{ needs.train.outputs.model_version }} to champion"
          # mlflow models transition-stage production-model $VERSION "Production"

      - name: Deploy model service
        run: |
          echo "Deploying model to production Kubernetes cluster"
          # kubectl set image deployment/model-server \
          #   model-server=ghcr.io/org/model-server:${{ needs.train.outputs.model_version }}
```

### Create the training script

Create `scripts/train_production.py`:

```python
"""Production model training script with MLflow tracking."""

import argparse
import json
import os
from pathlib import Path

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold, train_test_split
from sklearn.metrics import f1_score, accuracy_score, precision_score, recall_score


def main():
    parser = argparse.ArgumentParser(description="Train production model")
    parser.add_argument("--experiment", required=True)
    parser.add_argument("--data-hash", required=True)
    parser.add_argument("--output-version-file", required=True)
    args = parser.parse_args()

    mlflow.set_experiment(args.experiment)

    # Load data
    df = pd.read_parquet("data/training_data.parquet")
    X = df.drop(columns=["target"])
    y = df["target"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    with mlflow.start_run(run_name=f"production-{args.data_hash}") as run:
        # Log data lineage
        mlflow.log_param("data_hash", args.data_hash)
        mlflow.log_param("train_rows", len(X_train))
        mlflow.log_param("test_rows", len(X_test))
        mlflow.log_param("n_features", X_train.shape[1])

        # Train with best known hyperparameters
        model = GradientBoostingClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=10,
            random_state=42,
        )

        # Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_weighted")
        mlflow.log_metric("cv_f1_mean", cv_scores.mean())
        mlflow.log_metric("cv_f1_std", cv_scores.std())

        # Final training and evaluation
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        metrics = {
            "test_f1": float(f1_score(y_test, y_pred, average="weighted")),
            "test_accuracy": float(accuracy_score(y_test, y_pred)),
            "test_precision": float(precision_score(y_test, y_pred, average="weighted")),
            "test_recall": float(recall_score(y_test, y_pred, average="weighted")),
            "cv_f1_mean": float(cv_scores.mean()),
        }

        for key, value in metrics.items():
            mlflow.log_metric(key, value)

        # Register model
        model_info = mlflow.sklearn.log_model(
            model, "model",
            registered_model_name="production-model",
        )

        # Write outputs
        version = run.info.run_id[:8]
        Path(args.output_version_file).write_text(version)

        with open("metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)

        print(f"✅ Model version {version} trained successfully")
        print(f"   Test F1: {metrics['test_f1']:.4f}")


if __name__ == "__main__":
    main()
```

## Step 3: Model Monitoring Agents

Build a monitoring system that detects data drift and performance degradation.

### Create `monitoring/drift_detector.py`

```python
"""Model monitoring with data drift detection using Evidently."""

from dataclasses import dataclass
from datetime import datetime

import numpy as np
import pandas as pd
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
from evidently.report import Report


@dataclass
class DriftReport:
    timestamp: datetime
    dataset_drift: bool
    drift_share: float
    drifted_features: list[str]
    feature_details: dict[str, dict]


def detect_data_drift(
    reference_data: pd.DataFrame,
    current_data: pd.DataFrame,
    drift_threshold: float = 0.3,
) -> DriftReport:
    """Compare current data against reference to detect distribution shifts.

    Args:
        reference_data: Training/baseline data distribution
        current_data: Recent production data to check
        drift_threshold: Fraction of drifted features to trigger overall drift

    Returns:
        DriftReport with detailed drift information
    """
    report = Report(metrics=[DataDriftPreset(drift_share=drift_threshold)])
    report.run(reference_data=reference_data, current_data=current_data)

    results = report.as_dict()
    drift_results = results["metrics"][0]["result"]

    drifted_features = []
    feature_details = {}
    for col_name, col_data in drift_results.get("drift_by_columns", {}).items():
        detail = {
            "drift_detected": col_data.get("drift_detected", False),
            "drift_score": col_data.get("drift_score", 0.0),
            "stattest_name": col_data.get("stattest_name", ""),
        }
        feature_details[col_name] = detail
        if detail["drift_detected"]:
            drifted_features.append(col_name)

    return DriftReport(
        timestamp=datetime.utcnow(),
        dataset_drift=drift_results.get("dataset_drift", False),
        drift_share=drift_results.get("share_of_drifted_columns", 0.0),
        drifted_features=drifted_features,
        feature_details=feature_details,
    )


@dataclass
class PerformanceAlert:
    metric_name: str
    current_value: float
    threshold: float
    baseline_value: float
    severity: str  # "warning" | "critical"


def monitor_performance(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    baseline_metrics: dict[str, float],
    warning_threshold: float = 0.05,
    critical_threshold: float = 0.10,
) -> list[PerformanceAlert]:
    """Monitor model performance and generate alerts on degradation.

    Compares current metrics against baseline and flags drops.
    """
    from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score

    current_metrics = {
        "f1": f1_score(y_true, y_pred, average="weighted"),
        "precision": precision_score(y_true, y_pred, average="weighted"),
        "recall": recall_score(y_true, y_pred, average="weighted"),
        "accuracy": accuracy_score(y_true, y_pred),
    }

    alerts: list[PerformanceAlert] = []

    for metric_name, current_value in current_metrics.items():
        baseline = baseline_metrics.get(metric_name, 0)
        if baseline == 0:
            continue

        drop = (baseline - current_value) / baseline

        if drop >= critical_threshold:
            alerts.append(PerformanceAlert(
                metric_name=metric_name,
                current_value=current_value,
                threshold=critical_threshold,
                baseline_value=baseline,
                severity="critical",
            ))
        elif drop >= warning_threshold:
            alerts.append(PerformanceAlert(
                metric_name=metric_name,
                current_value=current_value,
                threshold=warning_threshold,
                baseline_value=baseline,
                severity="warning",
            ))

    return alerts
```

### Create the monitoring runner

Create `monitoring/runner.py`:

```python
"""Scheduled monitoring that checks for drift and triggers retraining."""

import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import httpx

from monitoring.drift_detector import detect_data_drift, monitor_performance


class MonitoringRunner:
    """Runs periodic checks and triggers alerts or retraining."""

    def __init__(
        self,
        reference_data_path: str,
        github_repo: str,
        github_token: str,
    ):
        self.reference_data = pd.read_parquet(reference_data_path)
        self.github_repo = github_repo
        self.github_token = github_token
        self.history: list[dict] = []

    def run_check(self, current_data: pd.DataFrame, y_true=None, y_pred=None) -> dict:
        """Run a full monitoring check and return results."""

        results = {"timestamp": datetime.utcnow().isoformat(), "actions": []}

        # Check data drift
        drift_report = detect_data_drift(self.reference_data, current_data)
        results["drift"] = {
            "detected": drift_report.dataset_drift,
            "drift_share": drift_report.drift_share,
            "drifted_features": drift_report.drifted_features,
        }

        if drift_report.dataset_drift:
            results["actions"].append("trigger_retraining")
            print(f"⚠️  Data drift detected! {len(drift_report.drifted_features)} features drifted")

        # Check model performance if labels are available
        if y_true is not None and y_pred is not None:
            baseline_metrics = json.loads(
                Path("monitoring/baseline_metrics.json").read_text()
            )
            alerts = monitor_performance(y_true, y_pred, baseline_metrics)
            results["performance_alerts"] = [
                {
                    "metric": a.metric_name,
                    "current": a.current_value,
                    "baseline": a.baseline_value,
                    "severity": a.severity,
                }
                for a in alerts
            ]

            critical_alerts = [a for a in alerts if a.severity == "critical"]
            if critical_alerts:
                results["actions"].append("trigger_retraining")
                results["actions"].append("page_oncall")
                print(f"🚨 Critical performance degradation: {[a.metric_name for a in critical_alerts]}")

        # Trigger retraining if needed
        if "trigger_retraining" in results["actions"]:
            self._trigger_retraining(results)

        self.history.append(results)
        return results

    def _trigger_retraining(self, results: dict):
        """Trigger a model retraining via GitHub Actions repository dispatch."""
        reason_parts = []
        if results.get("drift", {}).get("detected"):
            reason_parts.append(f"data drift ({results['drift']['drift_share']:.0%})")
        perf_alerts = results.get("performance_alerts", [])
        critical = [a for a in perf_alerts if a["severity"] == "critical"]
        if critical:
            reason_parts.append(f"performance drop ({', '.join(a['metric'] for a in critical)})")

        reason = "Auto-retrain: " + ", ".join(reason_parts)
        print(f"🔄 Triggering retraining: {reason}")

        # POST to GitHub repository dispatch API
        response = httpx.post(
            f"https://api.github.com/repos/{self.github_repo}/dispatches",
            json={
                "event_type": "model-retrain",
                "client_payload": {
                    "reason": reason,
                    "drift_report": results.get("drift", {}),
                    "performance_alerts": results.get("performance_alerts", []),
                    "timestamp": results["timestamp"],
                },
            },
            headers={
                "Authorization": f"Bearer {self.github_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        response.raise_for_status()
        print("✅ Retraining workflow dispatched")
```

## Step 4: A/B Testing Infrastructure

### Model serving with A/B routing

Create `serving/ab_router.py`:

```python
"""A/B test router for model serving with traffic splitting."""

import random
import time
from dataclasses import dataclass, field
from collections import defaultdict

import numpy as np


@dataclass
class ModelVariant:
    name: str
    model: object  # sklearn model or similar
    traffic_weight: float
    predictions: list[dict] = field(default_factory=list)


@dataclass
class ABTestConfig:
    test_id: str
    variants: list[ModelVariant]
    min_samples_per_variant: int = 1000
    confidence_level: float = 0.95


class ABRouter:
    """Route predictions to model variants based on traffic weights."""

    def __init__(self, config: ABTestConfig):
        self.config = config
        self.metrics: dict[str, list[float]] = defaultdict(list)

        # Normalize weights
        total_weight = sum(v.traffic_weight for v in config.variants)
        for v in config.variants:
            v.traffic_weight /= total_weight

    def route(self, features: np.ndarray) -> tuple[str, np.ndarray]:
        """Route a prediction request to a model variant.

        Returns (variant_name, prediction).
        """
        rand = random.random()
        cumulative = 0.0

        for variant in self.config.variants:
            cumulative += variant.traffic_weight
            if rand <= cumulative:
                start = time.monotonic()
                prediction = variant.model.predict(features.reshape(1, -1))
                latency = time.monotonic() - start

                variant.predictions.append({
                    "prediction": prediction[0],
                    "latency_ms": latency * 1000,
                    "timestamp": time.time(),
                })

                return variant.name, prediction

        # Fallback to last variant
        last = self.config.variants[-1]
        return last.name, last.model.predict(features.reshape(1, -1))

    def record_outcome(self, variant_name: str, metric_value: float):
        """Record a business metric outcome for a variant."""
        self.metrics[variant_name].append(metric_value)

    def get_test_results(self) -> dict:
        """Get current A/B test results with statistical significance."""
        from scipy import stats

        results = {}
        variant_names = [v.name for v in self.config.variants]

        for name in variant_names:
            values = self.metrics.get(name, [])
            results[name] = {
                "n_samples": len(values),
                "mean": float(np.mean(values)) if values else 0,
                "std": float(np.std(values)) if values else 0,
                "n_predictions": len(
                    next((v.predictions for v in self.config.variants if v.name == name), [])
                ),
            }

        # Pairwise statistical tests
        if len(variant_names) == 2:
            a_values = self.metrics.get(variant_names[0], [])
            b_values = self.metrics.get(variant_names[1], [])

            if len(a_values) >= 30 and len(b_values) >= 30:
                t_stat, p_value = stats.ttest_ind(a_values, b_values)
                results["statistical_test"] = {
                    "test": "welch_t_test",
                    "t_statistic": float(t_stat),
                    "p_value": float(p_value),
                    "significant": p_value < (1 - self.config.confidence_level),
                    "winner": (
                        variant_names[0]
                        if np.mean(a_values) > np.mean(b_values)
                        else variant_names[1]
                    )
                    if p_value < (1 - self.config.confidence_level)
                    else None,
                }

        return results
```

## Step 5: MCP Server for ML Experiment Data

Build an MCP server that connects Copilot to your MLflow experiment data:

### Create `ml-mcp-server.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "ml-experiment-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_experiments",
      description: "List all MLflow experiments with their latest metrics",
      inputSchema: {
        type: "object" as const,
        properties: {
          status: { type: "string", enum: ["active", "archived", "all"] },
        },
      },
    },
    {
      name: "get_model_performance",
      description: "Get performance metrics for a registered model across versions",
      inputSchema: {
        type: "object" as const,
        properties: {
          model_name: { type: "string", description: "Registered model name" },
          top_n: { type: "number", description: "Number of recent versions to return" },
        },
        required: ["model_name"],
      },
    },
    {
      name: "check_drift_status",
      description: "Check the latest data drift monitoring results",
      inputSchema: {
        type: "object" as const,
        properties: {
          model_name: { type: "string", description: "Model to check drift for" },
        },
        required: ["model_name"],
      },
    },
    {
      name: "get_ab_test_results",
      description: "Get current A/B test results between model variants",
      inputSchema: {
        type: "object" as const,
        properties: {
          test_id: { type: "string", description: "A/B test identifier" },
        },
        required: ["test_id"],
      },
    },
    {
      name: "trigger_retraining",
      description: "Trigger a model retraining pipeline via GitHub Actions",
      inputSchema: {
        type: "object" as const,
        properties: {
          model_name: { type: "string" },
          reason: { type: "string", description: "Why retraining is needed" },
          force_deploy: { type: "boolean", description: "Skip A/B test and deploy directly" },
        },
        required: ["model_name", "reason"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "list_experiments":
      return {
        content: [{
          type: "text",
          text: [
            "| Experiment | Runs | Best F1 | Last Run | Status |",
            "|------------|------|---------|----------|--------|",
            "| production-model | 47 | 0.9423 | 2h ago | active |",
            "| feature-experiment-v2 | 12 | 0.9387 | 1d ago | active |",
            "| baseline-comparison | 5 | 0.8912 | 7d ago | archived |",
          ].join("\n"),
        }],
      };

    case "get_model_performance": {
      const modelName = args?.model_name as string;
      const topN = (args?.top_n as number) || 5;
      return {
        content: [{
          type: "text",
          text: [
            `## ${modelName} — Last ${topN} Versions`,
            "",
            "| Version | F1 | Accuracy | Precision | Recall | Stage | Date |",
            "|---------|-----|----------|-----------|--------|-------|------|",
            "| v8 | 0.9423 | 0.9510 | 0.9445 | 0.9401 | Champion | 2d ago |",
            "| v7 | 0.9387 | 0.9462 | 0.9390 | 0.9384 | Archived | 1w ago |",
            "| v6 | 0.9401 | 0.9488 | 0.9415 | 0.9387 | Archived | 2w ago |",
            "| v5 | 0.9356 | 0.9430 | 0.9362 | 0.9350 | Archived | 3w ago |",
            "| v4 | 0.9312 | 0.9398 | 0.9320 | 0.9304 | Archived | 1mo ago |",
            "",
            `📈 Trend: F1 improved +1.2% over last 5 versions`,
          ].join("\n"),
        }],
      };
    }

    case "check_drift_status": {
      const modelName = args?.model_name as string;
      return {
        content: [{
          type: "text",
          text: [
            `## Drift Status: ${modelName}`,
            "",
            "**Overall:** ⚠️ Moderate drift detected (3/12 features)",
            "",
            "| Feature | Drift Score | Status |",
            "|---------|------------|--------|",
            "| user_age | 0.82 | 🔴 Drifted |",
            "| purchase_frequency | 0.71 | 🔴 Drifted |",
            "| session_duration | 0.65 | 🟡 Warning |",
            "| page_views | 0.23 | 🟢 Stable |",
            "| cart_value | 0.15 | 🟢 Stable |",
            "",
            "**Performance Impact:** F1 dropped from 0.942 to 0.931 (-1.2%)",
            "**Recommendation:** Schedule retraining with updated data",
          ].join("\n"),
        }],
      };
    }

    case "get_ab_test_results": {
      const testId = args?.test_id as string;
      return {
        content: [{
          type: "text",
          text: [
            `## A/B Test: ${testId}`,
            "",
            "| Variant | N | Conversion Rate | Avg Revenue | P95 Latency |",
            "|---------|---|----------------|-------------|-------------|",
            "| champion (v7) | 15,234 | 3.2% | $47.50 | 45ms |",
            "| challenger (v8) | 5,078 | 3.8% | $52.10 | 48ms |",
            "",
            "**Statistical Test:** Welch's t-test",
            "**P-value:** 0.023 (significant at α=0.05)",
            "**Winner:** challenger (v8) — +18.8% conversion, +9.7% revenue",
            "",
            "✅ Recommend promoting challenger to champion",
          ].join("\n"),
        }],
      };
    }

    case "trigger_retraining": {
      const modelName = args?.model_name as string;
      const reason = args?.reason as string;
      const forceDeploy = args?.force_deploy as boolean;
      return {
        content: [{
          type: "text",
          text: [
            `✅ Retraining triggered for ${modelName}`,
            "",
            `**Reason:** ${reason}`,
            `**Force deploy:** ${forceDeploy ? "Yes (skip A/B)" : "No (standard A/B test)"}`,
            `**Workflow:** train-model.yml (run #48)`,
            `**ETA:** ~25 minutes`,
            "",
            `Track progress: https://github.com/org/repo/actions/runs/12345`,
          ].join("\n"),
        }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ML Experiment MCP server running on stdio");
}

main().catch(console.error);
```

Now you can ask Copilot:

```
Check if the production-model has any data drift issues.
If drift is detected, trigger retraining with the reason and
show me the A/B test results for the current experiment.
```

## 🎯 Capstone: Build an Autonomous MLOps System

Combine all components into a production-ready MLOps platform:

### Components to build

1. **Training Pipeline** — GitHub Actions workflow with data validation, training, and evaluation
2. **Model Registry** — MLflow model registration with champion/challenger stages
3. **Monitoring System** — Drift detection and performance alerting
4. **A/B Testing** — Traffic-split model serving with statistical significance testing
5. **MCP Server** — Connect Copilot to experiment data, drift reports, and A/B results
6. **Auto-Retraining** — Triggered by drift detection or performance degradation

### Acceptance criteria

- [ ] Training pipeline validates data before training
- [ ] Models are compared against the champion before deployment
- [ ] Drift detector identifies shifted features correctly
- [ ] Performance monitor triggers alerts when metrics drop
- [ ] A/B router splits traffic according to configured weights
- [ ] MCP server responds to all 5 tool queries
- [ ] Retraining auto-triggers when drift or degradation is detected
- [ ] A README documents the full MLOps architecture

### Test the full loop

```bash
# Simulate a drift detection → retraining → deployment cycle
python -c "
from monitoring.runner import MonitoringRunner
import pandas as pd, numpy as np

runner = MonitoringRunner('data/reference.parquet', 'org/repo', 'ghp_...')

# Simulate drifted data
drifted = pd.read_parquet('data/reference.parquet')
drifted['user_age'] = drifted['user_age'] + np.random.normal(10, 5, len(drifted))

results = runner.run_check(drifted)
print(json.dumps(results, indent=2))
"
```

## 🎯 What You Learned

- Designing end-to-end MLOps pipeline architectures
- Building automated retraining workflows with GitHub Actions
- Implementing data drift detection with Evidently
- Creating model performance monitoring with alerting
- Building A/B testing infrastructure for model serving
- Connecting Copilot to ML experiment data through MCP servers
- Orchestrating the full ML lifecycle with autonomous triggers

## 📚 Glossary

- **Data drift**: A change in the statistical distribution of production data vs training data
- **Champion/Challenger**: A deployment pattern where the new model is compared against the current best
- **A/B testing**: Routing traffic to multiple model versions to compare business outcomes
- **MLOps**: The practice of applying DevOps principles to machine learning systems
- **Evidently**: An open-source tool for ML model monitoring and data quality checks
- **Repository dispatch**: A GitHub API for triggering workflows programmatically

## ➡️ Next Steps

You've mastered Copilot for Data Science! Explore related tracks:
- 🔴 [Copilot Power User: Custom Tools and Automation](/Learn-GHCP/courses/persona/developer-advanced/)
- 🔴 [Self-Healing Infrastructure with Agentic Copilot](/Learn-GHCP/courses/persona/devops-advanced/)
