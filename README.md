# Boxcar

Drive a train!

You can always try the latest build here: https://thomasburgess2000.github.io/boxcar/.

## Progress Photos

3/20/2024
![image](https://github.com/ThomasBurgess2000/boxcar/assets/14812407/2bd60b16-6063-4c6f-801d-aeabd94decd7)

3/01/2024
![image](https://github.com/ThomasBurgess2000/boxcar/assets/14812407/4969bde8-4864-492e-b2f5-e5f6c755922c)

12/14/2023
![image](https://github.com/ThomasBurgess2000/boxcar/assets/14812407/b74fbfdd-52c6-4517-9284-81ba584951c8)

## Build

`bun build ./index.ts --outdir ./build --watch`

## Run

`bun --hot run server.ts`


## TODO:
- [ ] Make perimetric LOD
- [ ] Create new map data when the camera moves outside the current map
- [ ] Fix tree spawning in the middle of tracks
- [ ] make the trees generate/dispose as you move
- [ ] Add walkable player using Havok physics
- [ ] Dispose far away track
- [ ] Be able to lower maxSubZ without terrain clipping through track and trees at wrong height (aspirational)
- [ ] Make fog work with dynamic terrain shader
- [ ] Make displacement/parallax occulusion map for terrain (does this require more detailed dynamic terrain?)
- [ ] Get draco compressed glbs to load
- [ ] figure out why startup is taking so long
- [x] Add wheels to train
- [x] Make chunked physics colliders for terrain (cannot be attached to terrain mesh directly otherwise it cannot move when the camera moves)
- [x] Clean up game.ts
- [x] Make larger map
- [x] Clean up dynamic terrain system (move params to component)
- [x] Add trees to the dynamic terrain

## Credits
Thank you to Finn-nico/Koko for the PRR D16 model.
