## STAGE 1: Build Angular application ##
FROM node:22-alpine AS builder
WORKDIR /tmp/workspace

# install dependencies
ADD package.json .
ADD package-lock.json .
RUN npm ci


# copy sourcecode and build
COPY . .
RUN sed 's/production: false/production: true/' src/environments/environment.ts > src/environments/environment.prod.ts
RUN npm run ng build

## STAGE 2: Run nginx to serve application ##
FROM nginx:alpine
RUN apk add envsubst
ARG COMMIT="no commit provided"
ENV COMMIT=${COMMIT}
ARG VERSION="no version provided"
ENV VERSION=${VERSION}
ADD build-env.sh /
COPY --from=builder /tmp/workspace/dist/senergy-web-ui/browser/ /usr/share/nginx/html/
RUN chmod -R a+r /usr/share/nginx/html
COPY build/conf /etc/nginx/conf.d/default.conf
CMD ["/bin/sh",  "-c",  "/build-env.sh /usr/share/nginx/html/ /usr/share/nginx/html/ && exec nginx -g 'daemon off;'"]

EXPOSE 80
