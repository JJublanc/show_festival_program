This is the pipelines to get data from festival sites and insert them into a MongoDB database.

## Create a virtual environment and install dependencies
```
pyenv local 3.9.4
poetry config virtualenvs.in-project true
poetry install
poetry shell # Activate the virtual environment
```

## Add a dependency
```
poetry add <package_name>
poetry add <package_name> --group dev # For development dependencies like
                                      # testing libraries
```

## Set you environment variables
```