FROM node:carbon-alpine
WORKDIR /app
#RUN yarn install && yarn compile
ENTRYPOINT ["yarn", "run"]
CMD ["start"]
