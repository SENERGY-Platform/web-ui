# SENERGY Web Ui

## Run 
``` 
npm run start_dev
```

if you get errors like
```
Error: The /workspace/ts/web-ui/src/environments/environment.dev.ts path in file replacements does not exist.
```
you can use the following command to create the missing file
```
cp src/environments/environment.ts src/environments/environment.dev.ts
```

## Use Local Properties Panel
```
change package.json

npm install
npm run start_dev
```

## Build ARGS für Docker bzw. Jenkins

Mit Hilfe des Befehls "--build-arg branch=" wird festgelegt, welcher Branch zum bauen für den 
properties-provider genutzt werden soll. Der Default-Wert ist master.
```
docker build --build-arg branch=master -t tag:prod . 
```
