@echo off
setlocal
:PROMPT
echo CAREFUL -- This will ERASE all postgres database data. ALL DATA WILL BE DELETED.
SET /P AREYOUSURE=Are you sure (Y/[N])?
IF /I "%AREYOUSURE%" NEQ "Y" GOTO END
set PGPASSWORD=password&& psql -U postgres -c "drop database osumpp_dev;"
set PGPASSWORD=password&& psql -U postgres -c "create database osumpp_dev;"
:END
endlocal
