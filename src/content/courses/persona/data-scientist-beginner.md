---
title: "Copilot for Data Science: AI-Powered Analysis"
description: "Use Copilot in Jupyter notebooks for data exploration, pandas operations, and visualization with minimal manual coding."
track: "persona"
difficulty: "beginner"
featureRefs:
  - code-completions
  - copilot-chat
personaTags:
  - data-scientist
technologyTags:
  - python
  - jupyter
  - pandas
  - matplotlib
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Copilot for Data Science: AI-Powered Analysis

Welcome! In this beginner course you'll learn to use Copilot for data exploration in Jupyter notebooks and VS Code — from loading datasets with pandas to creating publication-quality visualizations.

## Prerequisites

- A GitHub account with an active Copilot subscription
- VS Code with the Copilot and Jupyter extensions installed
- Python 3.10+ with pip
- Basic familiarity with Python

## Step 1: Setting Up Your Environment

Install the required packages:

```bash
pip install pandas matplotlib seaborn scikit-learn jupyter ipykernel
```

### Configure Copilot for notebooks

In VS Code, open Settings (`Ctrl+,`) and verify these are enabled:

```json
{
  "github.copilot.enable": {
    "jupyter": true,
    "python": true,
    "markdown": true
  }
}
```

Create a new Jupyter notebook in VS Code (`Ctrl+Shift+P` → "Create: New Jupyter Notebook").

> 💡 **Tip:** Copilot works in both `.py` files and `.ipynb` notebooks. In notebooks, it provides suggestions cell-by-cell.

## Step 2: Loading Data with Pandas

In your first notebook cell, type a descriptive comment and let Copilot complete the code:

```python
# Load the Iris dataset from scikit-learn and convert to a pandas DataFrame
# Add column names: sepal_length, sepal_width, petal_length, petal_width, species
```

Copilot suggests:

```python
from sklearn.datasets import load_iris
import pandas as pd

iris = load_iris()
df = pd.DataFrame(
    data=iris.data,
    columns=["sepal_length", "sepal_width", "petal_length", "petal_width"]
)
df["species"] = pd.Categorical.from_codes(iris.target, iris.target_names)
df.head()
```

### Loading CSV files

```python
# Load a CSV file with proper data types
# - Parse the 'date' column as datetime
# - Set 'id' column as the index
# - Handle missing values by replacing empty strings with NaN
```

Copilot generates:

```python
df = pd.read_csv(
    "data/sales.csv",
    parse_dates=["date"],
    index_col="id",
    na_values=["", "N/A", "null"],
    dtype={
        "product": "category",
        "region": "category",
        "amount": "float64",
    }
)
```

> 🔑 **Key insight:** The more specific your comment, the better Copilot's output. Mention data types, date formats, and edge cases explicitly.

## Step 3: Exploratory Data Analysis

Let Copilot guide your EDA workflow. Type these comment prompts one at a time:

### Basic statistics

```python
# Show basic statistics for the DataFrame:
# - Shape, data types, memory usage
# - Descriptive statistics for numeric columns
# - Count of missing values per column

print(f"Shape: {df.shape}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nMemory usage: {df.memory_usage(deep=True).sum() / 1024:.1f} KB")
print(f"\nDescriptive statistics:\n{df.describe()}")
print(f"\nMissing values:\n{df.isnull().sum()}")
```

### Group-by analysis

```python
# Calculate the mean of each numeric column grouped by species
# Sort by petal_length descending
# Round to 2 decimal places

species_stats = (
    df.groupby("species")
    .mean(numeric_only=True)
    .sort_values("petal_length", ascending=False)
    .round(2)
)
species_stats
```

### Correlation analysis

```python
# Compute the Pearson correlation matrix for numeric columns
# Display as a styled heatmap using pandas Styler

corr = df.select_dtypes(include="number").corr()
corr.style.background_gradient(cmap="coolwarm", vmin=-1, vmax=1).format("{:.2f}")
```

## Step 4: Creating Visualizations

Copilot excels at generating matplotlib and seaborn plots from natural-language descriptions.

### Scatter plot with color coding

```python
# Scatter plot of petal_length vs petal_width
# Color-code points by species
# Add a legend, axis labels, and title
# Use the 'Set2' color palette

import matplotlib.pyplot as plt
import seaborn as sns

plt.figure(figsize=(10, 6))
sns.scatterplot(
    data=df,
    x="petal_length",
    y="petal_width",
    hue="species",
    palette="Set2",
    s=80,
    alpha=0.8,
    edgecolor="white",
    linewidth=0.5,
)
plt.title("Iris: Petal Length vs Width by Species", fontsize=14, fontweight="bold")
plt.xlabel("Petal Length (cm)")
plt.ylabel("Petal Width (cm)")
plt.legend(title="Species", loc="upper left")
plt.tight_layout()
plt.show()
```

### Distribution plots

```python
# Create a 2x2 grid of histograms showing the distribution of each numeric feature
# Color by species with overlapping histograms (alpha=0.6)
# Add KDE curves on top

fig, axes = plt.subplots(2, 2, figsize=(12, 10))
features = ["sepal_length", "sepal_width", "petal_length", "petal_width"]

for ax, feature in zip(axes.ravel(), features):
    for species in df["species"].unique():
        subset = df[df["species"] == species]
        ax.hist(subset[feature], bins=15, alpha=0.6, label=species, density=True)
        subset[feature].plot.kde(ax=ax, linewidth=2)
    ax.set_title(feature.replace("_", " ").title())
    ax.set_xlabel("Value (cm)")
    ax.set_ylabel("Density")
    ax.legend()

plt.suptitle("Feature Distributions by Species", fontsize=16, fontweight="bold")
plt.tight_layout()
plt.show()
```

### Box plots

```python
# Box plot comparing all numeric features across species
# Use a melted DataFrame for seaborn's boxplot
# Highlight outliers in red

df_melted = df.melt(
    id_vars=["species"],
    value_vars=features,
    var_name="feature",
    value_name="value",
)

plt.figure(figsize=(12, 6))
sns.boxplot(
    data=df_melted,
    x="feature",
    y="value",
    hue="species",
    palette="Set2",
    flierprops={"markerfacecolor": "red", "markersize": 5},
)
plt.title("Feature Comparison Across Species", fontsize=14, fontweight="bold")
plt.xlabel("Feature")
plt.ylabel("Value (cm)")
plt.xticks(rotation=15)
plt.tight_layout()
plt.show()
```

### Correlation heatmap

```python
# Correlation heatmap with annotations
# Use a diverging color palette centered at 0
# Show values to 2 decimal places
# Mask the upper triangle

import numpy as np

corr = df.select_dtypes(include="number").corr()
mask = np.triu(np.ones_like(corr, dtype=bool))

plt.figure(figsize=(8, 6))
sns.heatmap(
    corr,
    mask=mask,
    annot=True,
    fmt=".2f",
    cmap="RdBu_r",
    center=0,
    vmin=-1,
    vmax=1,
    square=True,
    linewidths=0.5,
)
plt.title("Feature Correlation Matrix", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.show()
```

## Step 5: Statistical Summaries with Copilot Chat

Use Copilot Chat for deeper analysis. Open the chat panel and try:

**Interpret results:**
```
I have an Iris dataset with 4 numeric features and 3 species.
The correlation between petal_length and petal_width is 0.96.
What does this mean for my analysis, and should I consider dimensionality reduction?
```

**Generate statistical tests:**
```
Write a one-way ANOVA test to determine if petal_length differs
significantly across the three species in my Iris DataFrame.
Include the post-hoc Tukey HSD test if the ANOVA is significant.
```

Copilot generates:

```python
from scipy import stats
from statsmodels.stats.multicomp import pairwise_tukeyhsd

# One-way ANOVA
groups = [group["petal_length"].values for _, group in df.groupby("species")]
f_stat, p_value = stats.f_oneway(*groups)
print(f"ANOVA F-statistic: {f_stat:.4f}")
print(f"p-value: {p_value:.2e}")

if p_value < 0.05:
    print("\nSignificant difference detected. Running Tukey HSD:")
    tukey = pairwise_tukeyhsd(df["petal_length"], df["species"], alpha=0.05)
    print(tukey)
```

**Ask for next steps:**
```
Based on the Iris EDA, what machine learning models would you
recommend for classifying species? Suggest 3 approaches with pros/cons.
```

## 🎯 Hands-On Exercise: Analyze a Real Dataset

Download the [Titanic dataset](https://github.com/datasciencedojo/datasets) and perform a full EDA using Copilot:

1. **Load and clean** the data — handle missing values, convert types
2. **Explore** — summary statistics, value counts for categorical columns
3. **Visualize** — survival rate by class, age distribution, fare vs survival
4. **Statistically test** — is survival independent of passenger class? (chi-square test)
5. **Summarize** — write a markdown cell with your key findings

Use comments like these to guide Copilot:

```python
# Bar chart showing survival rate by passenger class and gender
# Stack survived/not survived, add percentage labels on each bar
```

## 🎯 What You Learned

- Setting up Copilot for Jupyter notebooks and Python files
- Loading datasets with pandas using descriptive comments
- Performing exploratory data analysis guided by Copilot
- Creating publication-quality visualizations with matplotlib and seaborn
- Running statistical tests and interpreting results with Copilot Chat

## 📚 Glossary

- **EDA (Exploratory Data Analysis)**: The process of examining datasets to summarize characteristics
- **Ghost text**: Inline code suggestions from Copilot that appear as you type
- **KDE (Kernel Density Estimation)**: A non-parametric way to estimate a probability distribution
- **Pearson correlation**: A measure of linear correlation between two variables (-1 to 1)
- **ANOVA**: Analysis of Variance — a statistical test for differences between group means

## ➡️ Next Steps

Ready for machine learning? Continue to the intermediate course:
- 🟡 [ML Workflows with Copilot](/Learn-GHCP/courses/persona/data-scientist-intermediate/)
