#!/usr/bin/env bash
sudo docker run --env CLOUDINARY_SECRET=$CLOUDINARY_SECRET -ti --volume="$(pwd)":/bot --rm zixia/wechaty index.ts