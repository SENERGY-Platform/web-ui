## STAGE 1: Build Angular application ##
FROM node:22-alpine as builder
WORKDIR /tmp/workspace

# install dependencies
ADD package.json .
ADD package-lock.json .
RUN npm ci


# copy sourcecode and build
COPY . .
RUN sed 's/production: false/production: true/' src/environments/environment.ts > src/environments/environment.prod.ts
#RUN npm run config -- --environment=prod
RUN node --max_old_space_size=8192 $(npm bin)/ng build --configuration production

## STAGE 2: Run nginx to serve application ##
FROM nginx
ARG COMMIT="no commit provided"
ENV COMMIT=${COMMIT}
ARG VERSION="no version provided"
ENV VERSION=${VERSION}
RUN apt-get update && apt-get install -y curl
ADD build-env.sh /
COPY --from=builder /tmp/workspace/dist/senergy-web-ui/ /usr/share/nginx/html/
COPY --from=builder /tmp/workspace/dist/senergy-web-ui/assets/nginx-custom.conf /etc/nginx/conf.d/default.conf
RUN chmod -R a+r /usr/share/nginx/html
COPY build/conf /etc/nginx/conf.d/default.conf
CMD ["/bin/sh",  "-c",  "/build-env.sh /usr/share/nginx/html/ /usr/share/nginx/html/ && exec nginx -g 'daemon off;'"]

EXPOSE 80
