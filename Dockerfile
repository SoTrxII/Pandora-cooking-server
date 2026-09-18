# Build stage, let's have as much cache as w can
FROM ubuntu:latest as build
WORKDIR /app

RUN apt update -y && DEBIAN_FRONTEND=noninteractive apt install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x |  bash -

# Install required build deps.
# - nodejs
# - dos2unix converts Windows line ending into linux's (in case the container is build on Windows)
# - build-essential && git are needed for npm install
RUN DEBIAN_FRONTEND=noninteractive apt install --no-install-recommends -y nodejs dos2unix build-essential git

# Install app deps
#
# --legacy-peer-deps because this build has no lockfile: only package.json is
# copied, and the repo's lockfile is a yarn.lock that npm ignores, so every
# build re-resolves against whatever is current on the registry. That drift is
# what broke releases 2.5.0 through 2.5.2 -- inversify floated to 6.2.2 whose
# peer wants reflect-metadata 0.2, then pinning inversify made
# inversify-express-utils float to 6.5.0 whose peer wants inversify ^6.0.3.
# Chasing peers one at a time cannot converge without a lockfile; npm 6 semantics
# are what this project has in fact always been built and run with.
COPY package.json /app/
# Set once for the stage rather than per command: npm prune below re-resolves
# the same tree and failed the 2.5.3 build for the same reason npm install did.
RUN echo "legacy-peer-deps=true" > /app/.npmrc
RUN npm install
COPY . /app/
COPY start.sh /app

# Converts all .sh script into Linux style line ending
RUN dos2unix cook.sh cook/* start.sh
# Compile all cooking .c utilities
RUN cd /app/cook && for i in *.c; do gcc -O3 -o ${i%.c} $i; done

# Transpile the app
RUN npm run build

# Reduce app size : remove dev deps and use modclean to remove extraneous files
RUN npm prune production
RUN npm install -g modclean && modclean -r

# "Pack" the app, allowing to copy both the transpiled app and node_modules into one copy step
RUN mkdir -p /app/pack && mv /app/dist/* /app/pack/ && mv /app/node_modules /app/pack/ && mv /app/start.sh /app/pack/


# Prod stage, the fewest layer the best
FROM ubuntu:latest  as prod
WORKDIR /app
RUN \
    # Install Node 18
    apt update -y && DEBIAN_FRONTEND=noninteractive apt install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x |  bash -

RUN \
    # Install runtime deps. This is mostly codecs used in cooking: \
    # Opus-tools -> Ogg format \
    # Nodejs \
    # Ffmpeg
    # flac -> Flac format \
    # Vorbis-tools -> vorbis format \
    # Zip -> Zip container \
    # fdkaac -> LE-AAC \
    # lame -> mp3 \
    # at -> Job manager used by the cooking scripts
    DEBIAN_FRONTEND=noninteractive apt install --no-install-recommends -y nodejs ffmpeg flac vorbis-tools zip fdkaac lame at opus-tools

RUN \
    # Remove all extraneous packages
    DEBIAN_FRONTEND=noninteractive apt purge -y curl \
    && apt clean autoclean && apt autoremove --yes \
    &&  rm -rf /root/.npm /usr/local/lib/node_modules/npm /var/lib/apt/lists/* /var/cache/apt/archives/*
COPY --from=build /app/pack /app
EXPOSE 3004
CMD ["/app/start.sh"]
