# Boxcar

Drive a train!

You can always try the latest build here: https://thomasburgess2000.github.io/boxcar/.

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
- [ ] Add wheels to train
- [ ] Be able to lower maxSubZ without terrain clipping through track and trees at wrong height (aspirational)
- [ ] Make fog work with dynamic terrain shader
- [x] Clean up game.ts
- [x] Make larger map
- [x] Clean up dynamic terrain system (move params to component)
- [x] Add trees to the dynamic terrain