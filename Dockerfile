FROM node:18.17.1-alpine as build
WORKDIR /app
COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY . .
ARG REACT_APP_NAME
ENV REACT_APP_NAME=$REACT_APP_NAME
EXPOSE 3000
RUN yarn build

FROM nginx
COPY --from=build /app/build /usr/share/nginx/html