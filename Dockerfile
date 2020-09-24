FROM ubuntu:latest as buil
WORKDIR /app
COPY package.json /app/
RUN apt update -y \
    && DEBIAN_FRONTEND=noninteractive apt install --no-install-recommends -y nodejs npm ffmpeg flac vorbis-tools build-essential zip fdkaac git \
    && npm install

COPY . /app/
RUN npm run build \
    && cd /app/cook \
    && for i in *.c; do gcc -O3 -o ${i%.c} $i; done

FROM ubuntu:latest  as prod
WORKDIR /app
COPY --from=build /app/dist /app
RUN apt update -y \
    && DEBIAN_FRONTEND=noninteractive apt install --no-install-recommends -y nodejs npm ffmpeg flac build-essential vorbis-tools zip fdkaac git\
    && npm install -g pm2 modclean \
    && npm install --only=prod \
    && modclean -r \
    && modclean -r /usr/local/lib/node_modules/pm2 \
    && npm uninstall -g modclean \
    && npm cache clear --force \
    && DEBIAN_FRONTEND=noninteractive apt purge -y build-essential git npm \
    && apt clean autoclean \
    && apt autoremove --yes \
    && rm -rf /root/.npm /usr/local/lib/node_modules/npm /var/lib/apt/lists/* /var/cache/apt/archives/*

EXPOSE 3004;
CMD ["pm2-runtime", "/app/server.js"]