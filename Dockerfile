## STAGE 1: Build Angular application ##
FROM node:14-alpine as builder
WORKDIR /tmp/workspace

# install dependencies
ADD package.json .
ADD package-lock.json .
RUN npm ci --unsafe-perm

# install properties-provider
ARG branch=master
ENV SOURCE=https://github.com/SENERGY-Platform/properties-provider/archive/${branch}.tar.gz
# force update of properties provider, date is always different and prevents caching
ARG DATE
RUN echo $DATE
RUN echo "Installing properties-provider from: "$SOURCE
RUN npm install $SOURCE

# copy sourcecode and build
COPY . .
RUN sed 's/production: false/production: true/' src/environments/environment.ts > src/environments/environment.prod.ts
#RUN npm run config -- --environment=prod
RUN node --max_old_space_size=8192 $(npm bin)/ng build --prod

## STAGE 2: Run nginx to serve application ##
FROM nginx
RUN apt-get update && apt install -y curl
ADD build-env.sh /
COPY --from=builder /tmp/workspace/dist/senergy-web-ui/ /usr/share/nginx/html/
COPY --from=builder /tmp/workspace/dist/senergy-web-ui/assets/nginx-custom.conf /etc/nginx/conf.d/default.conf
RUN chmod -R a+r /usr/share/nginx/html
CMD ["/bin/sh",  "-c",  "/build-env.sh /usr/share/nginx/html/ && exec nginx -g 'daemon off;'"]

EXPOSE 80
