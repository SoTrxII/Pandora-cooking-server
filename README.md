# Pandora cooking server

This is the cooking server for [Pandora](https://github.com/SoTrxII/Pandora).
All the audio processing scripts were written by Yahweasel for [Craig](https://github.com/Yahweasel/craig).
This project is just a server wrapper around the cooking scripts.

However, the cooking scripts have been slightly changed : 
+ Removed exclusive locking (only shared locks except for deletion), allowing multiple downloads at once.

## Usage
+ GET /<recording_id> 
    + Description : Process the recording identified by *recording_id*. 
    + Query string arguments :
        + format : Audio codec/extension wanted 
            + copy : Copy the raw ogg streams for each user. This option isn't compatible with the mix container.
            + oggflac
            + aac
            + he-aac : Be careful, this one is platform-dependant. See [limitations](#known-limitations--trivia).
            + vorbis
            + flac
            + opus
            + wav
            + adpcm
            + wav8
            + mp3 : Widespread but not that great, opus is way better.   
            + ra
        
        **Default: Opus**
        + container : "Box" to put the audio streams in
            + *mix* (One audio file for the whole recording)
            + *zip* (one audio file per user in a zip file)
            + *ogg* (Multi-channels .ogg file)
            + *matroska* (Multi-channels .mka file)
            + *aupzip* (one audio file par user in a zipped Audacity project ) 
        
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
docker run -it docker.pkg.github.com/sotrx/pandora-cooking-server/pandora-cooking-server:latest
```

#### Why not Alpine ? 
Alpine is lacking some unix tools and would require a custom ffmpeg build to run all the possible configuration of the
cooking process. The extra gain in space is not worth going through that honestly.  

### Natively
Running the server natively is a bit trickier, but not that difficult.

#### Requirements

The requirements are nearly the same as Craig's. 
You'll need all these installed : 
+ ffmpeg ( http://ffmpeg.org/ ) compiled with libopus support
+ flac ( https://xiph.org/flac/ )
+ oggenc ( https://xiph.org/vorbis/ )
+ opusenc ( http://opus-codec.org/ )
+ fdkaac ( https://github.com/nu774/fdkaac )
+ lame ( https://lame.sourceforge.io/ ) (mp3 support)
+ zip and unzip ( http://infozip.org/ )

Quick install command: 
```bash
# Debian-based distros
sudo apt install ffmpeg flac vorbis-tools zip fdkaac lame
# Red-Hat based distros (Yes there is really an extra hyphen)
sudo dnf install ffmpeg flac vorbis-tools zip fdk-aac lame
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

### Running the server

Copy .env.example into .env. Refer to the [configuration step](#configuration) to fill the values. 
When this is done, the quickest way to get the server running is to run:
   
    npm run start:dev
    
However, this is not the best way to run it in a production environment. 

A cleaner way would be to copy the **dist** directory, containing the transpiled Javascript, into another location and
only install the production dependencies.
```bash
# From the project's root
cp -r dist /away/pandora-cooking-server
cd /away/pandora-cooking-server
npm install --only=prod
node main.js
```
With this, the server should be up and running ! 

If you've read all this, congratulations. Now, seriously, just use Docker. 

## Configuration


## Known limitations && Trivia
+ Matroska containers can't contain either AAC or HE-AAC. More precisely, they *should* but it doesn't work. 
Thus, using AAC and Mastroska together is prevented by the server.
+ On Fedora (and probably every Red Hat distros), the fdk-aac package is "crippled" and doesn't support HE-AAC 
out of the box.






