---
title: "ML Workflows with Copilot"
description: "Build complete machine learning pipelines including feature engineering, model training, and evaluation using Copilot."
track: "persona"
difficulty: "intermediate"
featureRefs:
  - code-completions
  - copilot-chat
  - inline-chat
personaTags:
  - data-scientist
technologyTags:
  - python
  - scikit-learn
  - pytorch
  - mlflow
prerequisites:
  - data-scientist-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 ML Workflows with Copilot

In this intermediate course you'll build complete machine learning pipelines with Copilot — from feature engineering and model training to evaluation and experiment tracking with MLflow.

## Prerequisites

- Completed [Copilot for Data Science: AI-Powered Analysis](/Learn-GHCP/courses/persona/data-scientist-beginner/)
- Working knowledge of scikit-learn and basic ML concepts
- Python 3.10+ environment

### Install dependencies

```bash
pip install scikit-learn pandas numpy matplotlib seaborn mlflow xgboost optuna
```

## Step 1: Feature Engineering with Copilot

Feature engineering is where Copilot shines — describe the transformation you need, and it generates the implementation.

### Create a feature engineering pipeline

Create `features/engineer.py`:

```python
"""Feature engineering pipeline for tabular data."""

import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer


class DateFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extract useful features from datetime columns.

    Creates: year, month, day_of_week, is_weekend, quarter, days_since_epoch.
    """

    def __init__(self, date_column: str):
        self.date_column = date_column

    def fit(self, X: pd.DataFrame, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        dt = pd.to_datetime(X[self.date_column])
        X[f"{self.date_column}_year"] = dt.dt.year
        X[f"{self.date_column}_month"] = dt.dt.month
        X[f"{self.date_column}_day_of_week"] = dt.dt.dayofweek
        X[f"{self.date_column}_is_weekend"] = dt.dt.dayofweek.isin([5, 6]).astype(int)
        X[f"{self.date_column}_quarter"] = dt.dt.quarter
        epoch = pd.Timestamp("2020-01-01")
        X[f"{self.date_column}_days_since_epoch"] = (dt - epoch).dt.days
        X = X.drop(columns=[self.date_column])
        return X


class OutlierClipper(BaseEstimator, TransformerMixin):
    """Clip outliers using the IQR method.

    Values below Q1 - factor*IQR or above Q3 + factor*IQR are clipped.
    """

    def __init__(self, factor: float = 1.5):
        self.factor = factor
        self.lower_bounds_: dict[str, float] = {}
        self.upper_bounds_: dict[str, float] = {}

    def fit(self, X: pd.DataFrame, y=None):
        for col in X.select_dtypes(include="number").columns:
            q1 = X[col].quantile(0.25)
            q3 = X[col].quantile(0.75)
            iqr = q3 - q1
            self.lower_bounds_[col] = q1 - self.factor * iqr
            self.upper_bounds_[col] = q3 + self.factor * iqr
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for col in self.lower_bounds_:
            if col in X.columns:
                X[col] = X[col].clip(
                    lower=self.lower_bounds_[col],
                    upper=self.upper_bounds_[col]
                )
        return X


class InteractionFeatureGenerator(BaseEstimator, TransformerMixin):
    """Generate interaction features between specified column pairs.

    Creates: product, ratio, and difference features for each pair.
    """

    def __init__(self, column_pairs: list[tuple[str, str]]):
        self.column_pairs = column_pairs

    def fit(self, X: pd.DataFrame, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for col_a, col_b in self.column_pairs:
            X[f"{col_a}_x_{col_b}"] = X[col_a] * X[col_b]
            X[f"{col_a}_div_{col_b}"] = X[col_a] / X[col_b].replace(0, np.nan)
            X[f"{col_a}_minus_{col_b}"] = X[col_a] - X[col_b]
        return X


def build_preprocessing_pipeline(
    numeric_features: list[str],
    categorical_features: list[str],
    date_features: list[str] | None = None,
) -> ColumnTransformer:
    """Build a complete preprocessing pipeline.

    - Numeric: impute median → clip outliers → standard scale
    - Categorical: impute most frequent → one-hot encode
    - Date: extract temporal features
    """

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    transformers = [
        ("numeric", numeric_pipeline, numeric_features),
        ("categorical", categorical_pipeline, categorical_features),
    ]

    return ColumnTransformer(transformers=transformers, remainder="drop")
```

> 🔑 **Key insight:** By writing the docstrings and type hints first, you give Copilot a precise specification. It generates implementations that match your documented intent.

## Step 2: Model Training Scripts

Create `train.py` — a complete training script with multiple model comparison:

```python
"""Train and compare multiple models on a classification task."""

import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
import mlflow
import mlflow.sklearn


def get_model_candidates() -> dict[str, object]:
    """Return a dictionary of model candidates to evaluate."""
    return {
        "logistic_regression": LogisticRegression(
            max_iter=1000, random_state=42, class_weight="balanced"
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1, random_state=42
        ),
        "xgboost": XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            random_state=42, use_label_encoder=False, eval_metric="logloss"
        ),
        "svm": SVC(kernel="rbf", probability=True, random_state=42, class_weight="balanced"),
    }


def evaluate_model(
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    cv_folds: int = 5,
) -> dict:
    """Evaluate a model with cross-validation and test metrics."""

    # Cross-validation on training set
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_weighted")

    # Fit on full training set and predict on test set
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    return {
        "cv_f1_mean": cv_scores.mean(),
        "cv_f1_std": cv_scores.std(),
        "test_accuracy": accuracy_score(y_test, y_pred),
        "test_precision": precision_score(y_test, y_pred, average="weighted"),
        "test_recall": recall_score(y_test, y_pred, average="weighted"),
        "test_f1": f1_score(y_test, y_pred, average="weighted"),
        "classification_report": classification_report(y_test, y_pred),
        "confusion_matrix": confusion_matrix(y_test, y_pred),
    }


def compare_models(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    experiment_name: str = "model-comparison",
) -> pd.DataFrame:
    """Compare all model candidates and log results to MLflow."""

    mlflow.set_experiment(experiment_name)
    candidates = get_model_candidates()
    results = []

    for name, model in candidates.items():
        print(f"\n{'='*50}")
        print(f"Training: {name}")
        print(f"{'='*50}")

        with mlflow.start_run(run_name=name):
            metrics = evaluate_model(model, X_train, y_train, X_test, y_test)

            # Log to MLflow
            mlflow.log_param("model_type", name)
            mlflow.log_metric("cv_f1_mean", metrics["cv_f1_mean"])
            mlflow.log_metric("cv_f1_std", metrics["cv_f1_std"])
            mlflow.log_metric("test_accuracy", metrics["test_accuracy"])
            mlflow.log_metric("test_f1", metrics["test_f1"])
            mlflow.log_metric("test_precision", metrics["test_precision"])
            mlflow.log_metric("test_recall", metrics["test_recall"])
            mlflow.sklearn.log_model(model, "model")

            print(f"CV F1: {metrics['cv_f1_mean']:.4f} ± {metrics['cv_f1_std']:.4f}")
            print(f"Test F1: {metrics['test_f1']:.4f}")
            print(metrics["classification_report"])

            results.append({
                "model": name,
                "cv_f1_mean": metrics["cv_f1_mean"],
                "cv_f1_std": metrics["cv_f1_std"],
                "test_accuracy": metrics["test_accuracy"],
                "test_f1": metrics["test_f1"],
            })

    results_df = pd.DataFrame(results).sort_values("test_f1", ascending=False)
    print("\n📊 Model Comparison Summary:")
    print(results_df.to_string(index=False))
    return results_df
```

## Step 3: Hyperparameter Tuning

Use Copilot to generate an Optuna tuning script:

```python
"""Hyperparameter tuning with Optuna and MLflow tracking."""

import optuna
import mlflow
from sklearn.model_selection import cross_val_score, StratifiedKFold
from xgboost import XGBClassifier
import numpy as np


def create_objective(X_train: np.ndarray, y_train: np.ndarray):
    """Create an Optuna objective function for XGBoost tuning."""

    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 1000, step=50),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "gamma": trial.suggest_float("gamma", 0, 5),
        }

        model = XGBClassifier(
            **params,
            random_state=42,
            use_label_encoder=False,
            eval_metric="logloss",
            n_jobs=-1,
        )

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_weighted")

        # Log each trial to MLflow
        with mlflow.start_run(run_name=f"trial-{trial.number}", nested=True):
            for key, value in params.items():
                mlflow.log_param(key, value)
            mlflow.log_metric("cv_f1_mean", scores.mean())
            mlflow.log_metric("cv_f1_std", scores.std())

        return scores.mean()

    return objective


def tune_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_trials: int = 100,
    experiment_name: str = "xgboost-tuning",
) -> dict:
    """Run hyperparameter tuning and return the best parameters."""

    mlflow.set_experiment(experiment_name)

    with mlflow.start_run(run_name="optuna-study"):
        study = optuna.create_study(
            direction="maximize",
            sampler=optuna.samplers.TPESampler(seed=42),
            pruner=optuna.pruners.MedianPruner(n_warmup_steps=10),
        )

        study.optimize(
            create_objective(X_train, y_train),
            n_trials=n_trials,
            show_progress_bar=True,
        )

        best_params = study.best_params
        mlflow.log_params(best_params)
        mlflow.log_metric("best_cv_f1", study.best_value)

        print(f"\n🏆 Best trial:")
        print(f"  F1 Score: {study.best_value:.4f}")
        print(f"  Parameters: {best_params}")

    return best_params
```

## Step 4: Evaluation Pipelines

Create comprehensive evaluation with visualizations:

```python
"""Model evaluation with detailed metrics and visualizations."""

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    roc_curve,
    auc,
    precision_recall_curve,
    average_precision_score,
)
from sklearn.preprocessing import label_binarize


def plot_confusion_matrix(y_true, y_pred, class_names: list[str], title: str = "Confusion Matrix"):
    """Plot a normalized confusion matrix with annotations."""
    cm = confusion_matrix(y_true, y_pred)
    cm_normalized = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Raw counts
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=class_names, yticklabels=class_names, ax=axes[0]
    )
    axes[0].set_title(f"{title} (Counts)")
    axes[0].set_ylabel("True Label")
    axes[0].set_xlabel("Predicted Label")

    # Normalized
    sns.heatmap(
        cm_normalized, annot=True, fmt=".2%", cmap="Blues",
        xticklabels=class_names, yticklabels=class_names, ax=axes[1]
    )
    axes[1].set_title(f"{title} (Normalized)")
    axes[1].set_ylabel("True Label")
    axes[1].set_xlabel("Predicted Label")

    plt.tight_layout()
    return fig


def plot_roc_curves(y_true, y_score, class_names: list[str]):
    """Plot ROC curves for each class in a one-vs-rest fashion."""
    y_bin = label_binarize(y_true, classes=range(len(class_names)))
    n_classes = len(class_names)

    fig, ax = plt.subplots(figsize=(8, 6))
    colors = plt.cm.Set2(np.linspace(0, 1, n_classes))

    for i, (name, color) in enumerate(zip(class_names, colors)):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_score[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=color, linewidth=2, label=f"{name} (AUC={roc_auc:.3f})")

    ax.plot([0, 1], [0, 1], "k--", linewidth=1, alpha=0.5)
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.05])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curves (One-vs-Rest)")
    ax.legend(loc="lower right")
    plt.tight_layout()
    return fig


def plot_feature_importance(model, feature_names: list[str], top_n: int = 20):
    """Plot the top N most important features."""
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        importances = np.abs(model.coef_).mean(axis=0)
    else:
        print("Model does not expose feature importances.")
        return None

    importance_df = (
        pd.DataFrame({"feature": feature_names, "importance": importances})
        .sort_values("importance", ascending=True)
        .tail(top_n)
    )

    fig, ax = plt.subplots(figsize=(10, max(6, top_n * 0.3)))
    ax.barh(importance_df["feature"], importance_df["importance"], color="steelblue")
    ax.set_xlabel("Importance")
    ax.set_title(f"Top {top_n} Feature Importances")
    plt.tight_layout()
    return fig
```

## Step 5: MLflow Experiment Tracking

### Set up MLflow

```python
# Start the MLflow tracking server locally
# mlflow server --host 127.0.0.1 --port 5000

import mlflow

mlflow.set_tracking_uri("http://127.0.0.1:5000")
mlflow.set_experiment("iris-classification")
```

### Full training run with MLflow logging

```python
"""End-to-end training run with full MLflow tracking."""

from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
import mlflow
import mlflow.sklearn

# Load data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42, stratify=iris.target
)

# Run model comparison
results = compare_models(X_train, y_train, X_test, y_test, experiment_name="iris-classification")

# Take the best model and do hyperparameter tuning
best_model_name = results.iloc[0]["model"]
print(f"\n🏆 Best model: {best_model_name}")

# Log evaluation artifacts
best_model = get_model_candidates()[best_model_name]
best_model.fit(X_train, y_train)

with mlflow.start_run(run_name="best-model-evaluation"):
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)

    # Log confusion matrix
    cm_fig = plot_confusion_matrix(y_test, y_pred, list(iris.target_names))
    mlflow.log_figure(cm_fig, "confusion_matrix.png")

    # Log ROC curves
    roc_fig = plot_roc_curves(y_test, y_proba, list(iris.target_names))
    mlflow.log_figure(roc_fig, "roc_curves.png")

    # Log feature importance
    fi_fig = plot_feature_importance(best_model, list(iris.feature_names))
    if fi_fig:
        mlflow.log_figure(fi_fig, "feature_importance.png")

    # Register the best model
    mlflow.sklearn.log_model(
        best_model,
        "model",
        registered_model_name=f"iris-{best_model_name}",
    )

    print("✅ Evaluation artifacts logged to MLflow")
```

## 🎯 Hands-On Exercise: Build an End-to-End ML Pipeline

Build a complete pipeline for a binary classification task (e.g., Titanic survival prediction):

1. **Feature engineering** — Date extraction, outlier clipping, interaction features
2. **Preprocessing** — Imputation, scaling, encoding in a scikit-learn pipeline
3. **Model comparison** — Train 5+ models with cross-validation
4. **Hyperparameter tuning** — Optuna study with 50+ trials
5. **Evaluation** — Confusion matrix, ROC curves, feature importance
6. **MLflow tracking** — All experiments, metrics, and artifacts logged

```bash
# Start MLflow UI to review your experiments
mlflow ui --port 5000
# Open http://localhost:5000 in your browser
```

## 🎯 What You Learned

- Building custom scikit-learn transformers for feature engineering
- Creating model comparison pipelines with multiple algorithms
- Hyperparameter tuning with Optuna and MLflow integration
- Comprehensive model evaluation with visualizations
- Experiment tracking and model registry with MLflow

## 📚 Glossary

- **Feature engineering**: Creating new input features from raw data to improve model performance
- **Cross-validation**: A resampling technique to evaluate models on limited data
- **Hyperparameter tuning**: Searching for the best model configuration
- **MLflow**: An open-source platform for the ML lifecycle (tracking, models, deployment)
- **Optuna**: A hyperparameter optimization framework using Bayesian techniques
- **AUC-ROC**: Area Under the Receiver Operating Characteristic curve — a classification metric

## ➡️ Next Steps

Ready for production ML? Continue to the advanced course:
- 🔴 [MLOps Pipelines with Agentic Copilot](/Learn-GHCP/courses/persona/data-scientist-advanced/)
