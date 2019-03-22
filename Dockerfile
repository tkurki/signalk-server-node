FROM resin/raspberrypi3-alpine-node:8-slim
#FROM balenalib/raspberrypi3-node:8-stretch-run

# Install deps
RUN apk add --no-cache make gcc g++ python linux-headers udev git

WORKDIR /usr/src/signalk-server

COPY package.json ./
RUN JOBS=MAX npm install --production --unsafe-perm --build-from-source=serialport && npm cache verify && rm -rf /tmp/*

COPY . ./
RUN rm -rf samples


#ENV INITSYSTEM on
ENV SIGNALK_NODE_CONFIG_DIR=/data

EXPOSE 3000
CMD ["node", "/usr/src/signalk-server/bin/signalk-server"]
