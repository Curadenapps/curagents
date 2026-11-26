from setuptools import find_namespace_packages, setup

setup(
    name="cli-anything-bobadmin",
    version="0.1.0",
    description="Agent-native CLIs for BOB Admin (bob-admin) and BOB web app QA (bob-qa), CLI-Anything format",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    package_data={
        "cli_anything.bobadmin": ["openapi.json", "skills/*.md", "README.md"],
        "cli_anything.bobqa": ["skills/*.md", "README.md"],
    },
    python_requires=">=3.10",
    install_requires=["click>=8.0", "requests>=2.28", "dnspython>=2.3"],
    extras_require={"test": ["pytest>=7"]},
    entry_points={
        "console_scripts": [
            "cli-anything-bobadmin=cli_anything.bobadmin.bobadmin_cli:main",
            "bob-admin=cli_anything.bobadmin.bobadmin_cli:main",
            "cli-anything-bobqa=cli_anything.bobqa.bobqa_cli:main",
            "bob-qa=cli_anything.bobqa.bobqa_cli:main",
        ]
    },
)
