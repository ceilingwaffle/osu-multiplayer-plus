#!/bin/bash
# Drops and recreated the postgres database

# must be root
if [ "$EUID" -ne 0 ]
    then echo "Please run as root"
    exit
fi

# destructive confirmation
read -p "Are you sure? (y)" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    [[ "$0" = "$BASH_SOURCE" ]] && exit 1 || return 1 # handle exits from shell or function but don't exit interactive shell
fi

# execute script from relative path instead of pwd
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$parent_path"

# read vars from .env
read_var() {
    VAR=$(grep $1 $2 | xargs)
    IFS="=" read -ra VAR <<< "$VAR"
    echo ${VAR[1]}
}

DOT_ENV_PATH=../.env
POSTGRES_DBNAME=$(read_var POSTGRES_DBNAME $DOT_ENV_PATH)
POSTGRES_HOSTNAME=$(read_var POSTGRES_HOSTNAME $DOT_ENV_PATH)
POSTGRES_PORT=$(read_var POSTGRES_PORT $DOT_ENV_PATH)
POSTGRES_USERNAME=$(read_var POSTGRES_USERNAME $DOT_ENV_PATH)
sudo -u postgres -h $POSTGRES_HOSTNAME -p $POSTGRES_PORT psql -c "drop database $POSTGRES_DBNAME;"
sudo -u postgres -h $POSTGRES_HOSTNAME -p $POSTGRES_PORT createdb $POSTGRES_DBNAME
sudo -u postgres -h $POSTGRES_HOSTNAME -p $POSTGRES_PORT psql -c "grant all privileges on database $POSTGRES_DBNAME to $POSTGRES_USERNAME;"
