## STAGE 1: Build Angular application ##
FROM node:10-alpine as builder
# install git
RUN apk add --no-cache git

WORKDIR /workspace

# install dependencies
ADD package.json .
ADD package-lock.json .
RUN npm ci

# install properties-provider
ARG branch
ENV SOURCE=git+https://github.com/SENERGY-Platform/properties-provider.git#${branch}
RUN echo $SOURCE
RUN npm install $SOURCE

# copy sourcecode and build
COPY . .
RUN npm rebuild node-sass
RUN npm run config -- --environment=prod
RUN node --max_old_space_size=8192 $(npm bin)/ng build --prod

## STAGE 2: Run nginx to serve application ##
FROM nginx

COPY --from=builder /workspace/dist/senergy-web-ui/ /usr/share/nginx/html/
COPY --from=builder /workspace/dist/senergy-web-ui/assets/nginx-custom.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
