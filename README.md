# Pandora cooking server:

This is the cooking server for Pandora. All the audio processing scripts were written by Yahweasel 
for [Craig](https://github.com/Yahweasel/craig). This is basically just a server wrapper around the
cooking scripts.

## Usage

The API is very simple:

+ GET /<recording_id> 
    + Description : Process the recording identified by *recording_id*. 
    + Query string arguments :
        + format : Audio codec/extension wanted. **Default: Opus**
        + container: Either *mix* (One audio file for the whole recording) or *aupzip* (one audio file per user). 
        **Default: mix**
    + Examples :
        + /872660673?format=mp3&container=aupzip will produce one mp3 file for each user (don't use mp3).
        The returned file will be a zip file containing all mp3.
        + /2222?format=aac will return a single .aac audio file for the whole recording.
        
+ DELETE /<recording_id>
    + Description : delete the recording identified by *recording_id*. 


## Installation

### Docker
Using Docker to run the bot is the recommended (and easy) way.
```bash
# Either pull the bot from the GitHub registry (requiring login for some reason)
docker login docker.pkg.github.com --username <YOUR_USERNAME>
docker pull docker.pkg.github.com/sotrx/pandora-cooking-server/pandora-cooking-server:latest

# OR build it yourself (from the project's root)
docker build -t docker.pkg.github.com/sotrx/pandora-cooking-server/pandora-cooking-server:latest
```
Once the image is pulled/built, run it:

```bash
docker run \
-e USE_COMMAND_INTERFACE="<1 or 0>" \
-e USE_REDIS_INTERFACE="<1 or 0>" \
-e COMMAND_PREFX="." \
-e PANDORA_TOKEN="<DISCORD_BOT_TOKEN>" \
-e REDIS_HOST="<REDIS_DB_URL>" \
-it docker.pkg.github.com/sotrx/pandora-cooking-server/pandora-cooking-server:latest
```
Refer to the [configuration](#configuration) for an explanation of the environment variables.
The bot should be up and running !

#### Why not Alpine ? 
Alpine is lacking some unix tools and would require a custom ffmpeg build to run all the possible configuration of the
cooking process. The extra gain in space is not worth going through that honestly.  

### Natively
Running the server natively is a bit trickier, but not that difficult.

#### Requirements

The requirements are the same as Pandora's. 
You'll need all these installed : 
+ ffmpeg ( http://ffmpeg.org/ ) compiled with libopus support
+ flac ( https://xiph.org/flac/ )
+ oggenc ( https://xiph.org/vorbis/ )
+ opusenc ( http://opus-codec.org/ )
+ fdkaac ( https://github.com/nu774/fdkaac )
+ zip and unzip ( http://infozip.org/ )

Quick install command: 
```bash
# Debian-based distros
sudo apt install ffmpeg flac vorbis-tools zip fdkaac
# Red-Hat based distros (Yes there is really an extra hyphen)
sudo dnf install ffmpeg flac vorbis-tools zip fdk-aac
# Windows
(Use Docker, the cooking script is a pure Bash script, you won't be able to run it anyway) 
```

Next, all the cooking scripts needs to be compiled. Beware, you will need GCC/make/autoconf
(and maybe more depending on the distro).
```bash
# From the project's root
cd cook
for i in \*.c; do gcc -O3 -o ${i%.c} $i; done
```

#### Direct dependencies and transpilation

```bash
# nodejs and npm must be installed
npm install
# Transpile Typescript into Javascript
npm run build
```

### Running the Bot

Copy .env.example into .env. Refer to the [configuration step](#configuration) to fill the values. 
When this is done, the quickest way to get the bot running is to run:
   
    npm run start:dev
    
However, this is not the best way to run it in a production environment. 

A cleaner way would be to copy the **dist** directory, containing the transpiled Javascript, into another location and
only install the production dependencies (This is what the Dockerfile do).
```bash
# From the project's root
cp -r dist /away/pandora
cp .env /away/pandora/.env
cd /away/pandora

# We don't need all these devdependencies 
npm install --only=prod

# Load the .env file into the bot process.
npm install dotenv-safe
node -r dotenv-safe/config main.js
```
With this, Pandora should be up and running ! 

If you've read all this, congratulations. Now, seriously, just use Docker. 

## Configuration

Pandora uses 5 environment variables to control its runtime behaviour.

+ COMMAND_PREFX : This is the command prefix for the Discord commands. Use whatever you like.
+ PANDORA_TOKEN : Standard discord bot token. You can see your apps in the [Discord developers portal](https://discord.com/developers/applications)
+ USE_COMMAND_INTERFACE : Either "1" or "O" (Boolean). When enabled ("1") the bot will listen to Discord commands (<prefix>record, <prefix>end)
+ USE_REDIS_INTERFACE : Either "1" or "O" (Boolean). When enabled ("1") the bot will attempt to connect to the REDIS_HOST and listen to the command.
+ REDIS_HOST : Redis DB URL.

If USE_REDIS_INTERFACE is "0", REDIS_HOST is defaulting to localhost and can be not provided.
Both USE_COMMAND_INTERFACE and USE_COMMAND_INTERFACE can be enabled at the same time. The audio recording process is a Singleton. 
You could start a recording via Redis and end it via a discord command (Why tho ?).







